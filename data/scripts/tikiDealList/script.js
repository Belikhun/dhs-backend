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
			log(`📃 Đang lấy danh sách item`);
			log(` + typeMix    = ${typeMix}`);
			log(` + sortBy     = ${sortBy}`);
			log(` + saleFilter = ${saleFilter}`);

			heartbeat({ color: "yellow" });

			let start = time();
			let result = []

			if (typeMix) {
				for (let timeI = 0; timeI < dealTime.length; timeI++) {
					let time = dealTime[timeI];
					log(`🍿 TimeID: ${time.query_value} >> 🕗 ${time.display}`);

					for (let tagI = 0; tagI < selectedTags.length; tagI++) {
						let tag = selectedTags[tagI];
						log(` 🍭 Tag: ${tag.name}`);

						let pageTotal = null;
						let perPage = null;
						let maxPage = null;
						let page = 1;

						let pageLogE = document.createElement("content");
						pageLogE.innerText = `  📃 TRANG ?/?`;
						log(pageLogE);

						while (true) {
							if (pageTotal && page > maxPage)
								break;

							pageLogE.innerText = `  📃 TRANG ${page}/${maxPage || "?"}`;
							let current = await myajax({
								url: `${HOSTADDRESS}/api/v2/widget/deals/collection`,
								method: "GET",
								query: {
									categories: 1,
									page,
									tag_id: tag.query_value,
									time_id: time.query_value
								}
							});

							if (!pageTotal) {
								pageTotal = current.paging.total;
								perPage = current.paging.per_page;
								maxPage = Math.ceil(pageTotal / perPage);

								log(` 🔎 ${pageTotal} Item (${maxPage} trang)`);
							}

							let p1 = (tagI / selectedTags.length) + (1 / selectedTags.length) * (page / maxPage);
							let p2 = (timeI / dealTime.length) + (1 / dealTime.length) * p1;

							runInfo({
								now: page,
								end: maxPage,
								progress: p2 * 100,
								progWarn: false,
								itemStatus: `TRANG ${page}`,
								itemStatusColor: "yellow",
								dataType: "time",
								current: time.display,
								target: tag.name,
								checkDetail: "Đang Quét"
							});
	
							page++;
							result = [...result, ...current.data];
						}
					}
				}
			} else {
				let pageTotal = null;
				let perPage = null;
				let maxPage = null;
				let page = 1;

				let pageLogE = document.createElement("content");
				pageLogE.innerText = ` 📃 TRANG ?/?`;
				log(pageLogE);

				while (true) {
					if (pageTotal && page > maxPage)
						break;

					pageLogE.innerText = ` 📃 TRANG ${page}/${maxPage || "?"}`;
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

					if (!pageTotal) {
						pageTotal = current.paging.total;
						perPage = current.paging.per_page;
						maxPage = Math.ceil(pageTotal / perPage);

						log(`🔎 ${pageTotal} Item (${maxPage} trang)`);
					}

					runInfo({
						now: page,
						end: maxPage,
						progress: (page / maxPage) * 100,
						progWarn: false,
						itemStatus: `TRANG ${page}`,
						itemStatusColor: "yellow",
						dataType: "time",
						checkDetail: "Đang Quét"
					});

					page++;
					result = [...current.data, ...next.data]
				}
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
			});

			log(` + Lấy danh sách thành công`);
			heartbeat();
			log(` + Đang sắp xếp dữ liệu`);
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

			log(` + Sắp xếp dữ liệu thành công!`);
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

		// Fetch initial data
		let initalData = await myajax({
			url: `${HOSTADDRESS}/api/v2/widget/deals/collection`,
			method: "GET"
		});

		let dealTags = initalData.filters.tags.values;
		let dealTime = initalData.filters.times.values;

		log(`🕑 Các Mốc Thời Gian: `);
		for (let item of dealTime)
			log(` + ${item.query_value} ${item.display} ${(item.active) ? "ACT" : ""}`)

		let tagsSettings = {}

		for (let item of dealTags) {
			tagsSettings[`tag_${item.query_value}`] = {
				type: "checkbox",
				label: `
					<div style="display: flex; flex-direction: row; align-items: center;">
						<img style="width: 24px; height: 24px; border-radius: 8px;" src="${item.thumbnail_url}">

						<span style="padding-left: 5px;">
							<b style="font-size: 15px">${item.name}</b>
						</span>
					</div>
				`,
				color: "blue",
				depend: "typeMix",
				value: true
			}
		}

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

			typeMix: { type: "checkbox", label: "Deal theo khung giờ", color: "blue", value: true },
			...tagsSettings,

			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 70 }
		}, { confirm: "Tiếp" })

		log("PRE SETUP:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 26, true) + ` = ${settings[key]}`);

		let selectedTags = []
		for (let item of dealTags)
			if (settings[`tag_${item.query_value}`] === true)
				selectedTags.push(item);

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
			saleFilter: settings.saleFilter
		});

		let CURRENT_PAGE = 1;

		const changeAllListPage = async (page, {
			showCount = 20
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