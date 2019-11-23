// Script begin here
(async () => {
	var doCheck = true;
	var infoUpdateInterval = null;
	var timeUpdateInterval = null;

	const HOSTADDRESS = "https://tiki.vn/";
	var selectedPageList = []
	const pageList = {
		phoneTablet:	{ title: "Điện Thoại - Máy Tính Bảng", path: "dien-thoai-may-tinh-bang/c1789" },
		electronic:		{ title: "Điện Tử - Điện Lạnh", path: "dien-tu-dien-lanh/c4221" },
		accessories:	{ title: "Phụ Kiện - Thiết Bị Số", path: "thiet-bi-kts-phu-kien-so/c1815" },
		laptopIT:		{ title: "Laptop - Thiết Bị IT", path: "laptop-may-vi-tinh-linh-kien/c1846" },
		camera:			{ title: "Máy Ảnh - Quay Phim", path: "may-anh/c1801" },
		household:		{ title: "Điện Gia Dụng", path: "dien-gia-dung/c1882" },
		housewares:		{ title: "Nhà Cửa - Đời Sống", path: "nha-cua-doi-song/c1883" },
		consumerGood:	{ title: "Hàng Tiêu Dùng - Thực Phẩm", path: "bach-hoa-online/c4384" },
		toys:			{ title: "Đồ Chơi - Mẹ & Bé", path: "do-choi-me-be/c2549" },
		beauty:			{ title: "Làm Đẹp - Sức Khỏe", path: "lam-dep-suc-khoe/c1520" },
		fashion:		{ title: "Thời Trang - Phụ Kiện", path: "thoi-trang/c914" },
		sports:			{ title: "Thể Thao - Dã Ngoại", path: "the-thao-da-ngoai/c1975" },
		cars:			{ title: "Ô Tô, Xe Máy, Xe Đạp", path: "o-to-xe-may-xe-dap/c8594" },
		stationery:		{ title: "Sách, VPP & Quà Tặng", path: "nha-sach-tiki/c8322" },
		international:	{ title: "Hàng Quốc Tế", path: "hang-quoc-te/c17166" },
	}

	onCancel(() => {
		this.subScreen.hide();
		clearInterval(infoUpdateInterval);
		clearInterval(timeUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`|      Tiki Deal Hunter     |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 23:50:49 14/11/2019  |`);
		log(`|===========================|`);

		const getBlackList = async () => {
			let data = await this.dataLoad("tikiHuntBlackList");
			return Object.keys(data.tikiHuntBlackList || {});
		}

		const saveBlackList = async (list) => {
			let listObj = {}
			for (let i of list)
				if (!isNaN(i) && i !== "")
					listObj[i] = true;

			await this.dataSave({ tikiHuntBlackList: listObj });
		}

		const scanItem = async ({
			sortBy = "sale",
			pageCount = 1,
			saleFilter = 0
		} = {}) => {
			let list = {}
			let sortedList = []
			let blackList = await getBlackList();

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy    = ${sortBy}`);
			log(`   + pageCount = ${pageCount}`);

			for (let item of selectedPageList) {
				let start = time();
				log(`   + Đang tải: ${item.title}`);
				
				for (let page = 1; page <= pageCount; page++) {
					heartbeat({ color: "yellow" });
					let result = await myajax({
						url: HOSTADDRESS + item.path,
						method: "GET",
						query: {
							src: "mega-menu",
							order: "discount_percent,desc",
							page: page
						},
						type: "text"
					});

					heartbeat();
		
					let itemPage = (new DOMParser()).parseFromString(result, "text/html");
					let itemList = itemPage.querySelectorAll("div.product-item[data-id]");
	
					for (let item of itemList) {
						if (list[item.dataset.id] || blackList.indexOf(item.dataset.id) !== -1)
							continue;

						let link = item.querySelector("a[data-id]").href;
						let thumbnail = item.querySelector("a > div.content > span.image > img.product-image").src;
	
						let price = parseInt(item.dataset.price);
						let _priceBox = item.querySelector("a > div.content > p.price-sale > span.price-regular").innerText;
						let oldPrice = (_priceBox !== "") ? parseInt(_priceBox.match(/\d/g).join("")) : price;
						let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;
	
						if (priceSale < saleFilter)
							continue;

						let couponBox = item.querySelector("a > div.price-tag-wrap > p.price-tag > span.tag > span.code");
						let couponCode = null;
						let couponPrice = null;
						let couponSale = null;
	
						if (couponBox) {
							couponCode = couponBox.innerText;
							couponPrice = parseInt(item.querySelector("a > div.price-tag-wrap > p.price-tag > span.price > span").innerText.match(/\d/g).join(""));
							couponSale = ((oldPrice - couponPrice) / oldPrice) * 100;
						}
	
						list[item.dataset.id] = {
							id: item.dataset.id,
							pid: item.dataset.sellerProductId,
							title: item.dataset.title,
							link: link,
							price,
							priceSale,
							thumbnail,
							oldPrice,
							coupon: { code: couponCode, price: couponPrice, sale: couponSale },
							sale: couponSale || priceSale
						}
	
						sortedList.push(list[item.dataset.id]);
					}

					delete result;
				}
				
				log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);
			}

			log(`   + Lấy danh sách thành công`);
			heartbeat();
			log(`   + Đang sắp xếp dữ liệu`);

			switch (sortBy) {
				case "sale":
					sortedList.sort((a, b) => (a.sale < b.sale) ? 1 : (a.sale > b.sale) ? -1 : 0);
					break;
			
				case "name":
					sortedList.sort((a, b) => (a.title < b.title) ? 1 : (a.title > b.title) ? -1 : 0);
					break;

				case "haveCoupon":
					sortedList.sort((a, b) => a.coupon.code ? -1 : 1);
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

			let name = document.createElement("a");
			name.classList.add("name");
			name.innerText = itemData.title;
			name.href = itemData.link;
			name.target = "_blank";
			name.dataset.soundselect = "";
			sounds.applySound(name);
			box.appendChild(name);

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

			if (itemData.coupon.code) {
				let couponContainer = document.createElement("div");
				couponContainer.classList.add("coupon");
	
				let couponContainerCode = document.createElement("t");
				couponContainerCode.classList.add("code");
				couponContainerCode.innerText = itemData.coupon.code;
	
				let couponContainerPrice = document.createElement("span");
				couponContainerPrice.classList.add("price");
				couponContainerPrice.innerText = priceFormat(itemData.coupon.price);

				let couponContainerSale = document.createElement("t");
				couponContainerSale.classList.add("sale");
				couponContainerSale.innerText = `${-(itemData.coupon.sale).toFixed(2)}%`;

				couponContainer.append(couponContainerCode, couponContainerPrice, couponContainerSale);
				box.appendChild(couponContainer);
			}

			let blackList = document.createElement("span");
			blackList.classList.add("blackList");
			blackList.setAttribute("item-id", itemData.id);
			blackList.dataset.soundhoversoft = "";
			blackList.dataset.soundselectsoft = "";
			sounds.applySound(blackList);
			blackList.addEventListener("click", e => onBlacklist(e));

			priceInfo.append(currentPrice, oldPrice, discount);
			box.append(priceInfo, blackList);

			return box;
		}
		
		const createChangedItemBox = (itemData, onBlacklist = () => {}) => {
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

			if (itemData.coupon.code) {
				let couponContainer = document.createElement("div");
				couponContainer.classList.add("coupon");
	
				let couponContainerCode = document.createElement("t");
				couponContainerCode.classList.add("code");
				couponContainerCode.innerText = itemData.coupon.code;
	
				let couponContainerPrice = document.createElement("span");
				couponContainerPrice.classList.add("price");
				couponContainerPrice.innerText = priceFormat(itemData.coupon.price);

				let couponContainerSale = document.createElement("t");
				couponContainerSale.classList.add("sale");
				couponContainerSale.innerText = `${-(itemData.coupon.sale).toFixed(2)}%`;

				couponContainer.append(couponContainerCode, couponContainerPrice, couponContainerSale);
				infoBox.appendChild(couponContainer);
			}

			let blackList = document.createElement("span");
			blackList.classList.add("blackList");
			blackList.setAttribute("item-id", itemData.id);
			blackList.dataset.soundhoversoft = "";
			blackList.dataset.soundselectsoft = "";
			sounds.applySound(blackList);
			blackList.addEventListener("click", e => onBlacklist(e));

			priceInfo.append(currentPrice, oldPrice, discount);
			infoBox.append(priceInfo, blackList);
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

		//? Changed List Box
		let changedList = document.createElement("div");
		changedList.classList.add("container", "changed");

		let changedListHeader = document.createElement("div");
		changedListHeader.classList.add("header");

		let changedListHeaderInfo = document.createElement("span");
		changedListHeaderInfo.classList.add("info");
		changedListHeaderInfo.innerText = "Đã Bị Thay Đổi";

		changedListHeader.append(changedListHeaderInfo);

		var changedListItem = document.createElement("div");
		changedListItem.classList.add("itemList");

		changedList.append(changedListHeader, changedListItem);
		container.appendChild(changedList);

		//? All List Box
		let allList = document.createElement("div");
		allList.classList.add("container", "allList");
		
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
		allListHeader.append(allListHeaderInfo, allListHeaderPage);

		var allListItem = document.createElement("div");
		allListItem.classList.add("itemList");

		allList.append(allListHeader, allListItem);
		container.appendChild(allList);

		//? BLACK LIST
		const addToBlackList = async (id) => {
			let list = await getBlackList();
			let itemBoxList = document.querySelectorAll(`#subScreen > div.container .item[item-id="${id}"]`);
			
			for (let item of itemBoxList)
				deleteNode(item);

			list.push(id);
			await saveBlackList(list);
		}

		this.subScreen.show(container, "dealHunt");
		let blackList = await getBlackList();
		let pageListSetupData = {
			note: { type: "note", level: "info", text: `<b style="font-size: 14px">LỰA CHỌN DANH MỤC SẢN PHẨM</b>` }
		};

		for (let key of Object.keys(pageList))
			pageListSetupData[key] = {
				type: "checkbox",
				label: pageList[key].title,
				color: "blue",
				value: true
			}

		let pageListSetup = await setup(pageListSetupData, { confirm: "Tiếp" });

		log("DANH SÁCH TRANG:");

		for (let key of Object.keys(pageListSetup)) {
			log(` + ` + pleft(key, 18, true) + ` = ${pageListSetup[key]}`);
			
			if (pageListSetup[key] === true)
				selectedPageList.push(pageList[key]);
		}

		// Cool Down
		await delayAsync(1000);

		var firstScanSetup = await setup({
			sortBy: {
				type: "radio",
				label: "Sắp xếp theo",
				required: false,
				list: [
					{ name: `Tên`, color: "blue", value: "name" },
					{ name: `Mức giảm giá`, color: "pink", value: "sale", checked: true },
					{ name: `Có mã giảm giá`, color: "blue", value: "haveCoupon" },
					{ name: `Giá item (nhỏ đến lớn)`, color: "blue", value: "priceUp" },
					{ name: `Giá item (lớn đến nhỏ)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số Trang Quét Mỗi Loại", value: 1 },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 0 },
			blackList: { type: "textarea", label: "Danh Sách Đen", height: "180px", value: blackList.join(";") }
		}, { confirm: "Tiếp" })

		log("PRE SETUP:");

		for (let key of Object.keys(firstScanSetup))
			log(` + ` + pleft(key, 18, true) + ` = ${firstScanSetup[key]}`);
		
		// Save BlackList
		await saveBlackList(firstScanSetup.blackList.split(";"));

		// Start Scanning Item
		var itemList = await scanItem({
			sortBy: firstScanSetup.sortBy,
			pageCount: firstScanSetup.scanPage,
			saleFilter: firstScanSetup.saleFilter
		});
		var CURRENT_PAGE = 1;

		const changeAllListPage = async (page, {
			showCount = 10
		} = {}) => {
			let total = itemList.sortedList.length;
			let maxPage = (showCount === 0) ? 1 : Math.floor(total / showCount);

			if (page === "last")
				page = maxPage;

			let from = Math.max((page - 1) * showCount, 0);
			let to = Math.min(page * showCount, total - 1);

			if (page > maxPage || page < 1)
				return;

			allListItem.innerHTML = "";
			let blackList = await getBlackList();
			
			for (let i = from; i < to; i++) {
				if (blackList.indexOf(itemList.sortedList[i].id) !== -1) {
					if (itemList.list[itemList.sortedList[i].id])
						delete itemList.list[itemList.sortedList[i].id];

					itemList.sortedList.splice(i, 1);
				}

				allListItem.appendChild(createItemBox(itemList.sortedList[i], e => addToBlackList(e.target.getAttribute("item-id"))));
				allListHeaderPageCurrent.innerText = `${from + 1}-${to + 1} ${page}/${maxPage}`;
			}

			CURRENT_PAGE = page;
		}

		allListHeaderPageForward.addEventListener("mouseup", e => changeAllListPage("last"));
		allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
		allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
		allListHeaderPageBackward.addEventListener("mouseup", e => changeAllListPage(1));
		
		changeAllListPage(CURRENT_PAGE);

		let prevAccountList = (await this.dataLoad("tikiMA.accountList"))["tikiMA.accountList"] || "";

		const settings = await setup({
			delay: { type: "number", label: "Thời Gian Nghỉ", value: 10 },
			checkPriceHistory: { type: "checkbox", label: "Kiểm Tra Lịch Sử Giá", color: "blue", value: false },
			autobuy: { type: "checkbox", label: "Tự động mua", color: "pink", value: false, depend: "checkPriceHistory" },
			autobuyRatio: { type: "number", label: "Tỉ lệ giá", value: 8.5, step: 0.01, depend: "autobuy" },
			randomIp: { type: "checkbox", label: "Áp dụng IP ngẫu nhiên", color: "blue", value: false, depend: "autobuy" },
			ip: { type: "text", label: "Địa chỉ IP (tùy chọn)", depend: "randomIp", doubt: true },
			accountList: { type: "textarea", label: "Danh sách tài khoản", height: "180px", value: prevAccountList, required: true, depend: "autobuy" }
		})

		log(" + Đang lưu danh sách tài khoản");
		await this.dataSave({ "tikiMA.accountList": settings.accountList });
		var accountList = settings.accountList.split("\n").map(a => { let i = a.split(":"); return { u: i[0], p: i[1] } });

		if (settings.autobuy && this.page.url.host !== "tiki.vn") {
			rejectSetup("Current page is not TIKI.VN");
			return;
		}

		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		var runNth = 1;
		var checkNth = 0;
		var checkPer = 60;
		var startTime = time();
		var start = time();
		var end = start + settings.delay;

		var checker = async () => {
			checkNth++;

			let curTime = time();
			let runTime = end - curTime;
			let progress = (curTime - start) / (end - start);
			
			runInfo({
				current: runTime.toFixed(2),
				target: "0.00",
				progress: progress * 100,
				now: parseInt((end - start) - runTime),
				end: parseInt(end - start),
				saved: progress * 100,
				itemStatus: `Chạy lần ${runNth}`,
				itemStatusColor: "green",
				dataType: "time"
			})

			if (runTime <= 0) {
				let startCheck = time();
				log("");
				log(`Bắt đầu kiểm tra (lần ${runNth})`);
				await __doUpdate();
				log(` + KIỂM TRA HOÀN THÀNH`);
				log(` + Thời gian: ${(time() - startCheck).toFixed(2)}s`);

				// Reset
				runNth++;
				start = time();
				end = start + settings.delay;
			}
		}

		infoUpdateInterval = setInterval(() => {
			heartbeat({ color: "blue" });
			runInfo({ checkDetail: `TPS: ${checkNth}`, dataType: "time" });
			checkNth = 0;
		}, 1000)

		timeUpdateInterval = setInterval(() => {
			runInfo({
				time: time() - startTime,
				dataType: "time"
			})
		}, checkPer);

		const __checkHandler = async () => {
			if (!doCheck)
				return;
	
			let timeStart = time();
			await checker();
			setTimeout(() => __checkHandler(), checkPer - ((time() - timeStart) * 1000));
		}

		const __doUpdate = async () => {
			runInfo({ now: `Bước 1`, end: `Bước 2`, progress: 0, checkDetail: "Đang Lấy Danh Sách Item" });
			let list = await scanItem({
				sortBy: firstScanSetup.sortBy,
				pageCount: firstScanSetup.scanPage,
				saleFilter: firstScanSetup.saleFilter
			});

			runInfo({ now: `Bước 2`, progress: 50, progWarn: false, checkDetail: "Đang So Sánh Thông Tin" });
			let changed = 0;
			let changedList = []

			for (let item of list.sortedList) {
				if (itemList.list[item.id] && (itemList.list[item.id].price <= item.price || itemList.list[item.id].sale >= item.sale))
					continue;

				let blackList = await getBlackList();
				if (blackList.indexOf(item.id) !== -1) {
					log(` + ITEM trong BlackList: ${item.id}`);
					continue;
				}

				if (settings.checkPriceHistory) {
					log(` + Đang kiểm tra lịch sử giá (beeCost)`);
					log(`   + ID: ${item.id} PID: ${item.pid}`);

					let beeCost = await myajax({
						url: `https://apiv2.beecost.com/ecom/product/history`,
						method: "GET",
						query: {
							product_base_id: [3, item.pid, item.id].filter(Number).join("__")
						}
					})

					if (beeCost.status === "error") {
						log("   + Không thể lấy lịch sử giá Item");
						log(`     + MSG : ${beeCost.meta.message || "Không Rõ"}`);
						log(`     + Bỏ qua lỗi: true`);
					} else {
						let costData = beeCost.data.price_classification;
						let min = costData.min_price;
						log(`   + GIÁ THẤP NHẤT: ${min}`);

						if (item.price > min) {
							log(`   + Giá hiện tại không đạt yêu cầu: ${item.price} > ${min}`);
							log(`   + Đang bỏ qua`);

							continue;
						}

						let priceRatio = min / item.price;
						log(`   + PRICE RATIO: ${priceRatio.toFixed(2)}`);

						if (priceRatio >= settings.autobuyRatio) {
							log(`   + BẮT ĐẦU ĐẶT MUA`);

							for (var orderNth = 0; orderNth < accountList.length; orderNth++) {
								let item = accountList[orderNth];
			
								runInfo({ itemStatus: `Lần Mua ${orderNth + 1}/${accountList.length}`, itemStatusColor: "yellow" });
								heartbeat();
								log(`========== ACCOUNT ${orderNth + 1}/${accountList.length} ==========`);
			
								try {
									await __doOrder({
										id: item.id,
										count: 1,
										username: item.u,
										password: item.p
									});
								} finally {
									successCount++;
								}
			
								heartbeat();
								log(`Mua thành công cho tài khoản ${item.u}! (${orderNth + 1}Nth)`);
							}
						}
					}
				}

				changed++;

				if (itemList.list[item.id]) {
					log(` + ITEM Thay Đổi: ${item.id} [${changed}]`);
					log(`   + GIÁ:  ${itemList.list[item.id].price} -> ${item.price}`);
					log(`   + SALE: ${itemList.list[item.id].sale.toFixed(2)}% -> ${item.sale.toFixed(2)}%`);
				} else {
					log(` + ITEM Mới: ${item.id} [${changed}]`);
					log(`   + GIÁ:  ${item.price}`);
					log(`   + SALE: ${item.sale.toFixed(2)}%`);
				}
	
				//? Remove Old Box If Exist
				let existBox = changedListItem.querySelectorAll(`.item[item-id="${item.id}"]`);
				for (let item of existBox)
					deleteNode(item);
				
				let itemBox = createChangedItemBox(item, e => addToBlackList(e.target.getAttribute("item-id")));
				changedListItem.prepend(itemBox);
				changedList.push({ title: item.title, message: item.id + "" });
				itemList.list[item.id] = item;
			}

			if (changed > 0) {
				sounds.notification();
				chrome.notifications.create({
					type: "list",
					title: "Deal Hunter Suite",
					message: `Đã tìm thấy ${changed} item thay đổi giá`,
					contextMessage: `${(time() - start).toFixed(2)}s`,
					iconUrl: "/assets/img/icon@32x32.png",
					items: changedList,
					requireInteraction: true
				});
			}

			delete list;
			delete changedList;

			runInfo({ now: `Bước 2`, progress: 100, progWarn: false, checkDetail: "Thành Công" });
		}

		const __doOrder = async ({
			id = 0,
			count = 0,
			coupon = "",
			username = "",
			password = ""
		}) => {
			sounds.notification();
			let orderTimer = new stopClock();

			log(`Đang đăng xuất khỏi tài khoản hiện tại`);
			runInfo({ now: `Bước 1`, end: `Bước 6`, progress: 0, checkDetail: "Đang đăng xuất" });

			await command("ajax", {
				url: "/api/v2/account/logout",
				method: "GET",
				header: {
					"x-access-token": (await command("getCookie", { key: "TIKI_ACCESS_TOKEN" }))["TIKI_ACCESS_TOKEN"]
				}
			});

			log("Đăng xuất thành công");

			log(`Đang đăng nhập vào tài khoản \"${username}\"`);
			runInfo({ now: `Bước 2`, progress: 10, checkDetail: "Đang đăng nhập" });
			
			let CSRF_LOGIN = (await command("queryInput", { query: `input[name="TIKI_CSRF_TOKEN"]` })).value;
			log(` + CSRF: ${CSRF_LOGIN}`);
			
			let loginData = {}

			try {
				loginData = await command("ajax", {
					url: "/customer/account/ajaxLogin",
					method: "POST",
					form: {
						email: username,
						password: password,
						TIKI_CSRF_TOKEN: CSRF_LOGIN
					}
				});
			} catch(e) {
				await errored("Lỗi khi đăng nhập vào tài khoản");
				log(" + Không thể đăng nhập vào tài khoản");
				log(`    + Code: ${e.data.data.error.code}`);
				log(`    + MSG : ${e.data.data.error.message || "Không rõ"}`);
				
				if (e.data.data.error.errors)
					for (let item of e.data.data.error.errors) {
						log(`      + FIELD   : ${item.field}`);
						log(`      + MESSAGE : ${item.message || "Không rõ"}`);
					}

				throw { code: -1, description: "Thất bại khi đăng nhập vào tài khoản", data: e.data.data }
			}

			log("Đăng nhập thành công");

			log("Đang thêm Item vào Giỏ Hàng");
			runInfo({ now: `Bước 3`, progress: 20, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			let addData = {}

			try {
				addData = await command("ajax", {
					url: "/checkout/cart/ajaxAdd",
					method: "POST",
					form: {
						id: id,
						qty: count
					}
				});
			} catch(e) {
				triggerError(e);
				return false;
			}
	
			if (addData.error) {
				await errored("Lỗi khi thêm Item vào Giỏ");
				log(" + Không thể thêm Item vào Giỏ");
				log(`    + Code: -1`);
				log(`    + MSG : ${addData.error.message || "Không rõ"}`);
				throw { code: -1, description: "Không thể thêm Item vào Giỏ", data: addData.error }
			}

			heartbeat();
			log(" + Thêm vào giỏ thành công!");

			if (coupon !== "") {
				runInfo({ progress: 30, checkDetail: "Đang Áp Dụng Mã Giảm Giá" });

				log(` + Đang áp dụng Coupon: ${coupon}`)
				await command("ajax", {
					url: "/checkout/cart/ajaxCoupon",
					method: "POST",
					form: {
						coupon_code: coupon
					}
				})

				log(` + Áp dụng Coupon thành công!`);
			}
			
			heartbeat();
			runInfo({ now: `Bước 4`, progress: 40, checkDetail: "Đang chọn địa chỉ Giao Hàng" });
			log(`Đang chọn địa chỉ Giao Hàng`);

			log(` + Đang lấy thông tin địa chỉ`);
			let shippingRAW = await command("ajax", {
				url: "/checkout/shipping",
				method: "GET",
				type: "text"
			})

			heartbeat();
			runInfo({ progress: 50, progWarn: false });
			log(` + Đang phân tích thông tin`);
			let shippingDoc = (new DOMParser()).parseFromString(shippingRAW, "text/html");

			let CSRF_SHIPPING = shippingDoc.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
			log(` + CSRF: ${CSRF_SHIPPING}`);

			let shippingID = shippingDoc.querySelector("div.address-item.is-default > div > p.action > button.btn.saving-address").dataset.id;
			log(` + Đang chọn địa chỉ ID: ${shippingID}`);
			heartbeat();

			let selectAddress = await command("ajax", {
				url: "/checkout/shipping/ajaxSave",
				method: "POST",
				form: {
					address_id: shippingID,
					TIKI_CSRF_TOKEN: CSRF_SHIPPING
				}
			})

			runInfo({ now: `Bước 5`, progress: 60, progWarn: false, checkDetail: "Đang lấy thông tin thanh toán" });
			log(`Đang lấy thông tin Thanh Toán`);
			heartbeat();

			log(` + Đang nhận thông tin`);
			let paymentRAW = await command("ajax", {
				url: "/checkout/payment",
				method: "GET",
				type: "text"
			})
			
			heartbeat();
			log(` + Đang phân tích thông tin`);
			runInfo({ progress: 70, progWarn: false });
			let paymentDoc = (new DOMParser()).parseFromString(paymentRAW, "text/html");
			
			let CSRF_PAYMENT = paymentDoc.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
			log(` + CSRF: ${CSRF_PAYMENT}`);

			let paymentInput = paymentDoc.querySelectorAll("#form-payment input[name][type][value]");
			let paymentData = {}

			for (let item of paymentInput)
				if (item.name !== "")
					paymentData[item.name] = item.value;

			log(` + Phương thức thanh toán: COD`);
			paymentData.selected_payment_method = "cod";

			if (paymentDoc.getElementById("plan-3")) {
				log(` + Phát hiện Tiki Now!`);
				paymentData.shipping_plan = parseInt(paymentDoc.getElementById("plan-3").value);
			}

			log(` + Phương thức giao hàng: ${["Bình thường", null, "Tiki Now"][paymentData.shipping_plan - 1] || `PLAN#${paymentData.shipping_plan}` }`);
			paymentData.current_plan = paymentData.shipping_plan;

			if (settings.randomIp)
				settings.ip = [
					randBetween(1, 255),
					randBetween(1, 255),
					randBetween(1, 255),
					randBetween(1, 255)
				].join(".");

			if (settings.ip !== "") {
				log(` + Áp dụng địa chỉ IP: ${settings.ip}`);
				paymentData.customer_ip_address = settings.ip;
			}

			log(` + Gửi quà: false`);
			paymentData.is_sent_as_gift = 0;
			paymentData.is_gift_wrapping = 0;
			paymentData.gift_from = "";
			paymentData.gift_to = "";

			paymentData.is_using_card = 0;

			runInfo({ now: `Bước 6`, progress: 80, progWarn: false, checkDetail: "Bắt đầu đặt hàng" });
			log(`Đang tiến hành đặt hàng`);
			heartbeat();

			log(` + Đang nhận thông tin`);
			let placeOrder = await command("ajax", {
				url: "/checkout/payment/ajax_check_place_order",
				method: "POST",
				header: {
					"x-access-token": (await command("getCookie", { key: "TIKI_ACCESS_TOKEN" }))["TIKI_ACCESS_TOKEN"],
					apikey: null
				},
				form: {
					...paymentData,
					TIKI_CSRF_TOKEN: CSRF_PAYMENT
				}
			})

			if (placeOrder.message) {
				await errored("Lỗi khi tiến hành Đặt Hàng");
				log(" + Errored while ordering out Items");
				log(`    + Type: ${placeOrder.message.type}`);
				log(`    + MSG : ${placeOrder.message.content || "Không Rõ"}`);
				throw { code: -1, description: "Không thể tiến hành Order", data: placeOrder };
			}

			runInfo({ progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công" });
			heartbeat();
			log(" + doOrder đã hoàn thành!");
			log("=========== KẾT QUẢ ===========");
			log(` + Thời gian   : ${orderTimer.stop}s`);
		}

		__checkHandler();
		log("Bắt đầu chạy");
	} catch(e) {
		triggerError(e);
		return;
	}
})()