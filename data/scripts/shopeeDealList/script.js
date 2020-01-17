// Script begin here
(async () => {
	var infoUpdateInterval = null;
	var timeUpdateInterval = null;

	const HOSTADDRESS = {
		session: "https://shopee.vn/api/v2/flash_sale/get_all_sessions",
		list: "https://shopee.vn/api/v2/flash_sale/get_all_itemids",
		info: "https://shopee.vn/api/v2/flash_sale/flash_sale_batch_get_items"
	}

	onCancel((stop) => {
		if (stop)
			this.subScreen.hide();

		clearInterval(infoUpdateInterval);
		clearInterval(timeUpdateInterval);
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`| Shopee Upcoming Deal List |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 00:10:32 18/01/2020  |`);
		log(`|===========================|`);

		var CSRF = (await command("getCookie", { key: "csrftoken" })).csrftoken;

		if (!CSRF) {
			rejectSetup(`Không tìm thấy <b>CSRF</b> Token. <br><i>(Thử đăng nhập lại vào tài khoản Shopee)</i>`)
			return;
		}

		log(`CSRF: ${CSRF}`);


		let promotionList = await myajax({
			url: HOSTADDRESS.session,
			method: "GET"
		});

		const PROMOTIONID = promotionList.data.sessions[0].promotionid;

		log(`Promotion ID: ${PROMOTIONID}`);

		const scanItem = async ({
			sortBy = "sale",
			itemPerRequest = 12,
			saleFilter = 0
		} = {}) => {
			let list = {}
			let sortedList = []

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy         = ${sortBy}`);
			log(`   + itemPerRequest = ${itemPerRequest}`);
			log(`   + saleFilter     = ${saleFilter}`);

			heartbeat({ color: "yellow" });
			runInfo({
				now: 1,
				end: 1,
				progress: 0,
				itemStatus: `ĐANG LẤY DANH SÁCH ID`,
				itemStatusColor: "yellow",
				dataType: "time"
			})

			let start = time();

			let itemIDList = [[]];
			let itemID = await command("ajax", {
				url: HOSTADDRESS.list,
				method: "GET",
				query: {
					type: "coming",
					promotionid: PROMOTIONID,
					sort_soldout: true
				}
			});

			for (let item of itemID.data.item_brief_list) {
				if (itemIDList[itemIDList.length - 1].length >= itemPerRequest)
					itemIDList.push([]);

				itemIDList[itemIDList.length - 1].push(item.itemid);
			}

			for (let page = 0; page <= itemIDList.length - 1; page++) {
				heartbeat({ color: "yellow" });
				log(`   + Đang lấy trang ${page + 1}`);

				runInfo({
					now: page + 1,
					end: itemIDList.length,
					progress: ((page + 1) / itemIDList.length) * 100,
					itemStatus: `TRANG ${page + 1}`,
					itemStatusColor: "yellow",
					dataType: "time"
				})

				let start = time();
				let result = await command("ajax", {
					url: HOSTADDRESS.info,
					method: "POST",
					header: {
						"sec-fetch-mode": "cors",
						"sec-fetch-site": "same-origin",
						"x-api-source": "pc",
						"x-csrftoken": CSRF,
						"x-requested-with": "XMLHttpRequest"
					},
					json: {
						promotionid: PROMOTIONID,
						categoryid: 0,
						itemids: itemIDList[page],
						sort_soldout: true,
						limit: itemIDList[page].length,
						need_personalize: false,
						with_dp_items: true
					}
				});

				heartbeat();

				for (let item of result.data.items) {
					if (list[item.itemid])
						continue;

					//! Skip No Old Price
					if (!item.price_before_discount)
						continue;

					let link = `https://shopee.vn/product-i.${item.shopid}.${item.itemid}`;
					let thumbnail = `https://cf.shopee.vn/file/${item.image}`;

					let price = item.price / 100000;
					let oldPrice = item.price_before_discount / 100000 || price;
					let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;

					if (priceSale < saleFilter)
						continue;

					let couponBox = null;
					let couponCode = null;
					let couponPrice = null;
					let couponSale = null;

					if (couponBox) {
						couponCode = "unknown";
						couponPrice = parseInt(0);
						couponSale = ((oldPrice - couponPrice) / oldPrice) * 100;
					}

					list[item.itemid] = {
						id: item.itemid,
						title: item.name,
						link: link,
						price,
						priceSale,
						thumbnail,
						oldPrice,
						coupon: { code: couponCode, price: couponPrice, sale: couponSale },
						sale: couponSale || priceSale,
						open: item.start_time,
						progress: {
							percent: (item.stock / item.flash_sale_stock) * 100,
							qty: item.flash_sale_stock,
							qty_remain: item.stock
						}
					}

					sortedList.push(list[item.itemid]);
				}

				log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);

				runInfo({
					current: sortedList.length,
					target: result.data.items.length,
					saved: (sortedList.length / result.data.items.length) * 100,
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
		allListHeaderPage.classList.add("pageChange");

		var allListHeaderPageForward = document.createElement("span");
		allListHeaderPageForward.classList.add("forward");
		allListHeaderPageForward.dataset.soundhover = "";
		allListHeaderPageForward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageForward);

		var allListHeaderPageNext = document.createElement("span");
		allListHeaderPageNext.classList.add("next");
		allListHeaderPageNext.dataset.soundhover = "";
		allListHeaderPageNext.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageNext);

		var allListHeaderPageCurrent = document.createElement("t");
		allListHeaderPageCurrent.classList.add("current");

		var allListHeaderPagePrev = document.createElement("span");
		allListHeaderPagePrev.classList.add("prev");
		allListHeaderPagePrev.dataset.soundhover = "";
		allListHeaderPagePrev.dataset.soundselect = "";
		sounds.applySound(allListHeaderPagePrev);

		var allListHeaderPageBackward = document.createElement("span");
		allListHeaderPageBackward.classList.add("backward");
		allListHeaderPageBackward.dataset.soundhover = "";
		allListHeaderPageBackward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageBackward);

		allListHeaderPage.append(allListHeaderPageBackward, allListHeaderPagePrev, allListHeaderPageCurrent, allListHeaderPageNext, allListHeaderPageForward);
		
		let allListHeaderFilter = document.createElement("span");
		allListHeaderFilter.classList.add("pageFilter");

		let allListHeaderFilterAll = createSwitch("Toàn bộ", "blue", false, "radio");
		allListHeaderFilterAll.input.name = `sdl_filter`;
		allListHeaderFilterAll.input.value = "none";
		allListHeaderFilterAll.input.checked = true;

		let allListHeaderFilter1k = createSwitch("1k", "pink", false, "radio");
		allListHeaderFilter1k.input.name = `sdl_filter`;
		allListHeaderFilter1k.input.value = "1k";
		allListHeaderFilter1k.input.checked = false;

		let allListHeaderFilter9k = createSwitch("9k", "pink", false, "radio");
		allListHeaderFilter9k.input.name = `sdl_filter`;
		allListHeaderFilter9k.input.value = "9k";
		allListHeaderFilter9k.input.checked = false;

		allListHeaderFilter.append(allListHeaderFilterAll.group, allListHeaderFilter1k.group, allListHeaderFilter9k.group);

		allListHeader.append(allListHeaderInfo, allListHeaderFilter, allListHeaderPage);

		var allListItem = document.createElement("div");
		allListItem.classList.add("itemList");

		allList.append(allListHeader, allListItem);
		container.appendChild(allList);

		this.subScreen.show(container, "dealHunt");

		var settings = await setup({
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
			itemPerRequest: { type: "number", label: "Số item mỗi lần lấy thông tin", value: 12 },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 70 }
		}, { confirm: "Tiếp" })

		log("PRE SETUP:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		var startTime = time();

		timeUpdateInterval = setInterval(() => {
			runInfo({
				time: time() - startTime,
				dataType: "time"
			})
		}, 60);

		log("Bắt đầu chạy");

		// Start Scanning Item
		var itemList = await scanItem({
			sortBy: settings.sortBy,
			itemPerRequest: settings.itemPerRequest,
			saleFilter: settings.saleFilter
		});
		var CURRENT_PAGE = 1;
		var CURRENT_FILTER = "none";

		const changeAllListPage = async (page, {
			showCount = 10
		} = {}) => {
			let filtered = itemList.sortedList.filter(item => {
				switch (CURRENT_FILTER) {
					case "1k":
						return (item.price === 1000);
				
					case "9k":
						return (item.price === 9000);

					default:
						return true;
				}
			});

			let total = filtered.length;
			let maxPage = (showCount === 0) ? 1 : Math.floor(total / showCount);

			if (page === "last")
				page = maxPage;

			let from = Math.max((page - 1) * showCount, 0);
			let to = Math.min(page * showCount, total - 1);

			if (page > maxPage || page < 1)
				return;

			allListItem.innerHTML = "";
			
			for (let i = from; i < to; i++) {
				allListItem.appendChild(createItemBox(filtered[i], e => addToBlackList(e.target.getAttribute("item-id"))));
				allListHeaderPageCurrent.innerText = `${from + 1}-${to + 1} ${page}/${maxPage}`;
			}

			CURRENT_PAGE = page;

			delete filtered;
			delete total;
			delete maxPage;
			delete from;
			delete to;
		}

		allListHeaderPageForward.addEventListener("mouseup", e => changeAllListPage("last"));
		allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
		allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
		allListHeaderPageBackward.addEventListener("mouseup", e => changeAllListPage(1));

		let filterUpdate = () => {
			CURRENT_FILTER = document.querySelector(`input[name=sdl_filter]:checked`).value;
			log(`Filter Change: ${CURRENT_FILTER}`);
			changeAllListPage(1);
		}

		allListHeaderFilterAll.input.addEventListener("input", filterUpdate);
		allListHeaderFilter1k.input.addEventListener("input", filterUpdate);
		allListHeaderFilter9k.input.addEventListener("input", filterUpdate);
		
		changeAllListPage(CURRENT_PAGE);

		runInfo({ checkDetail: "Đã Chạy Xong", dataType: "time" })
		await complete();
	} catch(e) {
		triggerError(e);
		return;
	}
})()