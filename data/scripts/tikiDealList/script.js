// Script begin here
(async () => {
	let infoUpdateInterval = null;
	let timeUpdateInterval = null;

	const HOSTADDRESS = "https://tiki.vn";

	onCancel((stop) => {
		if (stop)
			this.subScreen.hide();

		clearInterval(infoUpdateInterval);
		clearInterval(timeUpdateInterval);
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`|  Tiki Upcoming Deal List  |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 22:05:55 24/09/2020  |`);
		log(`|===========================|`);

		const scanItem = async ({
			typeMix = false,
			sortBy = "sale",
			pageCount = 1,
			saleFilter = 0
		} = {}) => {
			let list = {}
			let sortedList = []

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + typeMix    = ${typeMix}`);
			log(`   + sortBy     = ${sortBy}`);
			log(`   + pageCount  = ${pageCount}`);
			log(`   + saleFilter = ${saleFilter}`);
			runInfo({
				end: pageCount,
				dataType: "time"
			});

			for (let page = 1; page <= pageCount; page++) {
				heartbeat({ color: "yellow" });
				log(`📃 TRANG ${page}`);
				runInfo({
					now: page,
					progress: (page / pageCount) * 100,
					itemStatus: `TRANG ${page}`,
					itemStatusColor: "yellow",
					dataType: "time"
				});

				let start = time();
				let result = []

				if (typeMix) {
					for (let tagID = 1; tagID <= 5; tagID++) {
						let current = await myajax({
							url: `${HOSTADDRESS}/api/v2/widget/deals/mix`,
							method: "GET",
							query: {
								categories: 1,
								page: page,
								tag_id: tagID
							}
						});

						log(`🍿 MixID: ${tagID}`);
						result = [...result, ...current.data];
					}
				} else {
					let current = await myajax({
						url: `${HOSTADDRESS}/api/v2/widget/deals/hot`,
						method: "GET",
						query: {
							categories: 1,
							page: page
						}
					});
	
					let next = { data: [] }
					
					if (current.tabs && current.tabs.length)
						for (let item of current.tabs) {
							if (item.active)
								continue;
	
							log(`🕒 ${item.display} ID: ${item.query_value}`);
							
							let response = await myajax({
								url: `${HOSTADDRESS}/api/v2/widget/deals/hot`,
								method: "GET",
								query: {
									categories: 1,
									page: page,
									time_id: item.query_value
								}
							});
	
							next.data = [...next.data, ...response.data]
						}
	
					result = [...current.data, ...next.data]
				}

				heartbeat();

				for (let item of result) {
					if (list[item.product.id])
						continue;

					let link = "https://tiki.vn/" + item.product.url_path;
					let thumbnail = item.product.thumbnail_url;

					let price = item.product.price;
					let oldPrice = item.product.list_price;
					let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;

					if (priceSale < saleFilter)
						continue;

					list[item.product.id] = {
						id: item.product.id,
						title: item.product.name,
						link: link,
						price,
						priceSale,
						thumbnail,
						oldPrice,
						sale: priceSale,
						open: item.special_from_date,
						progress: item.progress
					}

					sortedList.push(list[item.product.id]);
				}

				log(`⏱ Thời gian: ${(time() - start).toFixed(2)}s`);

				runInfo({
					current: sortedList.length,
					target: result.length,
					saved: - (sortedList.length / result.length) * 100,
					dataType: "time"
				})
			}

			log(`   + Lấy danh sách thành công`);
			heartbeat();
			log(`   + Đang sắp xếp dữ liệu`);
			switch (sortBy) {
				case "sale":
					sortedList.sort((a, b) => (a.sale < b.sale) ? 1 : (a.sale > b.sale) ? -1 : 0);
					break;
			
				case "openTime":
					sortedList.sort((a, b) => (a.open < b.open) ? -1 : (a.open > b.open) ? 1 : 0);
					break;

				case "name":
					sortedList.sort((a, b) => (a.title < b.title) ? 1 : (a.title > b.title) ? -1 : 0);
					break;

				case "priceUp":
					sortedList.sort((a, b) => (a.price < b.price) ? -1 : (a.price > b.price) ? 1 : 0);
					break;

				case "priceDown":
					sortedList.sort((a, b) => (a.price < b.price) ? 1 : (a.price > b.price) ? -1 : 0);
					break;

				default:
					break;
			}

			log(`   + Sắp xếp dữ liệu thành công!`);
			return { list, sortedList }
		}

		const createItemBox = (itemData, onBlacklist = () => {}) => {
			let box = document.createElement("div");
			box.classList.add("item");
			box.setAttribute("item-id", itemData.id);
			box.dataset.soundhover = "";
			sounds.applySound(box);

			let thumbnail = document.createElement("div");
			thumbnail.classList.add("lazyload", "thumbnail");

			let thumbnailImage = document.createElement("img");
			thumbnailImage.onload = (e) => e.target.parentElement.dataset.loaded = 1;
			thumbnailImage.src = itemData.thumbnail;

			let thumbnailSpinner = document.createElement("div");
			thumbnailSpinner.classList.add("simple-spinner");

			thumbnail.append(thumbnailImage, thumbnailSpinner);

			let infoBox = document.createElement("div");
			infoBox.classList.add("info");

			let name = document.createElement("a");
			name.classList.add("name");
			name.innerText = itemData.title;
			name.href = itemData.link;
			name.target = "_blank";
			name.dataset.soundselect = "";
			sounds.applySound(name);
			infoBox.appendChild(name);

			let priceInfo = document.createElement("span");
			priceInfo.classList.add("priceInfo");
			
			let currentPrice = document.createElement("t");
			currentPrice.classList.add("current", "price");
			currentPrice.innerText = priceFormat(itemData.price);

			let oldPrice = document.createElement("t");
			oldPrice.classList.add("old", "price");
			oldPrice.innerText = priceFormat(itemData.oldPrice);

			let discount = document.createElement("t");
			discount.classList.add("discount");
			discount.innerText = `${(-itemData.priceSale).toFixed(2)}%`;
			
			priceInfo.append(currentPrice, oldPrice, discount);

			let dealInfo = document.createElement("span");
			dealInfo.classList.add("dealInfo");

			let dealOpen = document.createElement("t");
			dealOpen.classList.add("open");
			liveTime(dealOpen, itemData.open, { count: "down", ended: "Đã Bắt Đầu" });

			let dealProgress = document.createElement("span");
			dealProgress.classList.add("progressBar");

			let dealProgressBar = document.createElement("span");
			dealProgressBar.classList.add("bar");
			dealProgressBar.dataset.color = (itemData.progress.percent) < 50 ? "red" : "green";
			dealProgressBar.style.width = `${itemData.progress.percent}%`;

			let dealProgressRemain = document.createElement("t");
			dealProgressRemain.classList.add("left");
			dealProgressRemain.innerText = itemData.progress.qty_remain;

			let dealProgressTotal = document.createElement("t");
			dealProgressTotal.classList.add("right");
			dealProgressTotal.innerText = itemData.progress.qty;

			dealProgress.append(dealProgressBar, dealProgressRemain, dealProgressTotal);
			dealInfo.append(dealOpen, dealProgress);

			infoBox.append(priceInfo, dealInfo);
			box.append(thumbnail, infoBox);

			return box;
		}

		const deleteNode = (node) => node.parentElement.removeChild(node);

		//* ==============
		//*   START HERE
		//* ==============

		await info({ hide: true });

		// Container Element Init
		let container = document.createElement("div");

		let title = document.createElement("t");
		title.classList.add("title");
		title.innerText = "Danh sách Item";
		container.appendChild(title);

		//? All List Box
		let allList = document.createElement("div");
		allList.classList.add("container", "changed");
		
		let allListHeader = document.createElement("div");
		allListHeader.classList.add("header");

		let allListHeaderInfo = document.createElement("span");
		allListHeaderInfo.classList.add("info");
		allListHeaderInfo.innerText = "Toàn Bộ";

		let allListHeaderPage = document.createElement("span");
		allListHeaderPage.classList.add("buttonBox");

		let allListHeaderPageForward = document.createElement("span");
		allListHeaderPageForward.classList.add("forward");
		allListHeaderPageForward.dataset.soundhover = "";
		allListHeaderPageForward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageForward);

		let allListHeaderPageNext = document.createElement("span");
		allListHeaderPageNext.classList.add("next");
		allListHeaderPageNext.dataset.soundhover = "";
		allListHeaderPageNext.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageNext);

		let allListHeaderPageCurrent = document.createElement("t");
		allListHeaderPageCurrent.classList.add("current");

		let allListHeaderPagePrev = document.createElement("span");
		allListHeaderPagePrev.classList.add("prev");
		allListHeaderPagePrev.dataset.soundhover = "";
		allListHeaderPagePrev.dataset.soundselect = "";
		sounds.applySound(allListHeaderPagePrev);

		let allListHeaderPageBackward = document.createElement("span");
		allListHeaderPageBackward.classList.add("backward");
		allListHeaderPageBackward.dataset.soundhover = "";
		allListHeaderPageBackward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageBackward);

		allListHeaderPage.append(allListHeaderPageBackward, allListHeaderPagePrev, allListHeaderPageCurrent, allListHeaderPageNext, allListHeaderPageForward);
		allListHeader.append(allListHeaderInfo, allListHeaderPage);

		let allListItem = document.createElement("div");
		allListItem.classList.add("itemList");

		allList.append(allListHeader, allListItem);
		container.appendChild(allList);

		this.subScreen.show(container, "dealHunt");

		let settings = await setup({
			sortBy: {
				type: "radio",
				label: "Sắp xếp theo",
				required: false,
				list: [
					{ name: `Tên`, color: "blue", value: "name" },
					{ name: `Mức giảm giá`, color: "pink", value: "sale", checked: true },
					{ name: `Thời gian mở bán`, color: "blue", value: "openTime" },
					{ name: `Giá item (nhỏ đến lớn)`, color: "blue", value: "priceUp" },
					{ name: `Giá item (lớn đến nhỏ)`, color: "blue", value: "priceDown" }
				]
			},

			typeMix: { type: "checkbox", label: "Deal theo khung giờ", color: "blue", value: false },
			scanPage: { type: "number", label: "Số trang quét", value: 1 },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 70 }
		}, { confirm: "Tiếp" })

		log("PRE SETUP:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		let startTime = time();

		timeUpdateInterval = setInterval(() => {
			runInfo({
				time: time() - startTime,
				dataType: "time"
			})
		}, 60);

		log("Bắt đầu chạy");

		// Start Scanning Item
		let itemList = await scanItem({
			typeMix: settings.typeMix,
			sortBy: settings.sortBy,
			pageCount: settings.scanPage,
			saleFilter: settings.saleFilter
		});
		let CURRENT_PAGE = 1;

		const changeAllListPage = async (page, {
			showCount = 10
		} = {}) => {
			let total = itemList.sortedList.length;
			let maxPage = (showCount === 0) ? 1 : Math.max(1, Math.floor(total / showCount));

			if (page === "last")
				page = maxPage;

			let from = Math.max((page - 1) * showCount, 0);
			let to = Math.min(page * showCount, total - 1);

			if (page > maxPage || page < 1)
				return;

			emptyNode(allListItem);
			
			for (let i = from; i < to; i++) {
				allListItem.appendChild(createItemBox(itemList.sortedList[i], e => addToBlackList(e.target.getAttribute("item-id"))));
				allListHeaderPageCurrent.innerText = `${from + 1}-${to + 1} ${page}/${maxPage}`;
			}

			CURRENT_PAGE = page;

			delete total;
			delete maxPage;
			delete from;
			delete to;
		}

		allListHeaderPageForward.addEventListener("mouseup", e => changeAllListPage("last"));
		allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
		allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
		allListHeaderPageBackward.addEventListener("mouseup", e => changeAllListPage(1));
		
		changeAllListPage(CURRENT_PAGE);

		runInfo({ checkDetail: "Đã Chạy Xong", dataType: "time" })
		await complete();
	} catch(e) {
		triggerError(e);
		return;
	}
})()