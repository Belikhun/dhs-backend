// Script begin here
(async () => {
	var runNth = 1;
	var doCheck = true;
	var beaconNote = []
	var timeUpdateInterval = null;

	const HOSTADDRESS = "https://tiki.vn";
	var selectedPageList = []
	const pageList = {
		phoneTablet:	{ title: "Điện Thoại - Máy Tính Bảng", path: "/dien-thoai-may-tinh-bang/c1789" },
		electronic:		{ title: "Điện Tử - Điện Lạnh", path: "/dien-tu-dien-lanh/c4221" },
		accessories:	{ title: "Phụ Kiện - Thiết Bị Số", path: "/thiet-bi-kts-phu-kien-so/c1815" },
		laptopIT:		{ title: "Laptop - Thiết Bị IT", path: "/laptop-may-vi-tinh-linh-kien/c1846" },
		camera:			{ title: "Máy Ảnh - Quay Phim", path: "/may-anh/c1801" },
		household:		{ title: "Điện Gia Dụng", path: "/dien-gia-dung/c1882" },
		housewares:		{ title: "Nhà Cửa - Đời Sống", path: "/nha-cua-doi-song/c1883" },
		consumerGood:	{ title: "Hàng Tiêu Dùng - Thực Phẩm", path: "/bach-hoa-online/c4384" },
		toys:			{ title: "Đồ Chơi - Mẹ & Bé", path: "/do-choi-me-be/c2549" },
		beauty:			{ title: "Làm Đẹp - Sức Khỏe", path: "/lam-dep-suc-khoe/c1520" },
		fashion:		{ title: "Thời Trang - Phụ Kiện", path: "/thoi-trang/c914" },
		sports:			{ title: "Thể Thao - Dã Ngoại", path: "/the-thao-da-ngoai/c1975" },
		cars:			{ title: "Ô Tô, Xe Máy, Xe Đạp", path: "/o-to-xe-may-xe-dap/c8594" },
		stationery:		{ title: "Sách, VPP & Quà Tặng", path: "/nha-sach-tiki/c8322" },
		international:	{ title: "Hàng Quốc Tế", path: "/hang-quoc-te/c17166" },
	}

	onCancel(() => {
		this.subScreen.hide();
		clearInterval(timeUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);
	const errored = () => {}

	try {
		log(`|===========================|`);
		log(`|      Tiki Gift Hunter     |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 19:40:30 19/05/2020  |`);
		log(`|===========================|`);

		const getBlackList = async () => Object.keys(await this.dataLoad("tikiHuntBlackList") || {}).map(i => parseInt(i));

		const saveBlackList = async (list) => {
			let listObj = {}
			for (let i of list)
				if (!isNaN(i) && i !== "")
					listObj[i] = true;

			await this.dataSave({ tikiHuntBlackList: listObj });
		}

		const getToken = async (retry = true) => {
			let at = await this.getCookie("https://tiki.vn", "TIKI_ACCESS_TOKEN");
	
			if (!at || !at.value) {
				let gt = await this.getCookie("https://tiki.vn", "TIKI_GUEST_TOKEN");

				if (!gt || !gt.value) {
					if (retry) {
						log("🔐 Cập nhật Cookies 🍪");
						await myajax({
							url: `${HOSTADDRESS}/api/v2/me`,
							method: "GET"
						});

						return (await getToken(false));
					} else
						throw { code: -1, description: "Tiki Token Not Found" }
				}

				return gt.value;
			}
	
			return at.value;
		}

		const scanItem = async ({
			sortBy = "sale",
			pageCount = 1,
			saleFilter = 0,
			doSort = true,
			printLog = true,
			itemHandler = () => {}
		} = {}, set = () => {}) => {
			let list = {}
			let sortedList = []
			let blackList = await getBlackList();

			heartbeat();
			if (printLog) {
				log(`📃 Đang lấy danh sách item`);
				log(` + sortBy    = ${sortBy}`);
				log(` + pageCount = ${pageCount}`);
			}

			for (let itemNth = 0; itemNth < selectedPageList.length; itemNth++) {
				let item = selectedPageList[itemNth];
				let pageLoaded = 0;
				let pageList = [];
				let start = time();

				runInfo({
					itemStatus: `[${runNth}] ${item.title}`,
					itemStatusColor: "green",
					dataType: "time"
				})
				
				await new Promise((resolve, reject) => {
					for (let page = 1; page <= pageCount; page++) {
						heartbeat({ color: "yellow" });

						myajax({
							url: HOSTADDRESS + item.path,
							method: "GET",
							query: {
								src: "mega-menu",
								order: "discount_percent,desc",
								page: page
							},
							type: "text"
						}).catch(e => {
							heartbeat({ color: "red" });
							log("⚠ Lỗi đã xảy ra khi lấy danh sách Item");
							log(` + Code: ${e.code}`);
							log(` + MSG : ${e.description || "Không Rõ"}`);
							log(` + Bỏ qua lỗi: true`);

							pageLoaded++;
							return;
						}).then((result) => {
							// Calc progress
							pageLoaded++;

							let now = (itemNth * pageCount + pageLoaded);
							let end = pageCount * selectedPageList.length;
							set((now / end) * 100, now, end);
							delete now;
							delete end;
							heartbeat();
				
							let itemPage = (new DOMParser()).parseFromString(result, "text/html");
							let itemList = itemPage.querySelectorAll("div.product-item[data-id]");
			
							for (let item of itemList) {
								if (list[item.dataset.id] || blackList.indexOf(item.dataset.id) !== -1)
									continue;

								let link = HOSTADDRESS + item.querySelector("a[data-id]").getAttribute("href");
								let thumbnail = item.querySelector("a > div.content > span.image > img.product-image").src;
			
								let price = parseInt(item.dataset.price);
								let _priceBox = item.querySelector("a > div.content > p.price-sale > span.price-regular");
								let oldPrice = (_priceBox && _priceBox.innerText !== "") ? parseInt(_priceBox.innerText.match(/\d/g).join("")) : price;
								let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;
			
								if (priceSale < saleFilter)
									continue;

								let couponBox = item.querySelector("div.price-tag-wrap p.price-tag > span.tag > span.code");
								let couponCode = null;
								let couponPrice = null;
								let couponSale = null;
			
								if (couponBox && couponBox.innerText) {
									let couponPriceBox = item.querySelector("div.price-tag-wrap p.price-tag > span.price > span");
		
									couponCode = couponBox.innerText;
									couponPrice = (couponPriceBox && couponPriceBox.innerText)
										? parseInt(couponPriceBox.innerText.match(/\d/g).join(""))
										: price;
										
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
			
								if (doSort)
									sortedList.push(list[item.dataset.id]);

								pageList.push(list[item.dataset.id]);
							}

							delete result;

							if (pageLoaded >= pageCount)
								resolve();
						})
				}})

				for (let item of pageList)
					await itemHandler(item);
				
				runInfo({
					checkDetail: `Lần quét vừa rồi dài ${(time() - start).toFixed(2)}s`,
					dataType: "time"
				})
			}

			if (doSort) {
				heartbeat();
				log(`🔩 Đang sắp xếp dữ liệu`);
	
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
			}

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

		//? Changed List Box
		let changedList = document.createElement("div");
		changedList.classList.add("container", "changed");

		let changedListHeader = document.createElement("div");
		changedListHeader.classList.add("header");

		let changedListHeaderInfo = document.createElement("span");
		changedListHeaderInfo.classList.add("info");
		changedListHeaderInfo.innerText = "Đã Bị Thay Đổi";

		let changedListHeaderPage = document.createElement("span");
		changedListHeaderPage.classList.add("buttonBox");

		var changedListHeaderPageDelete = document.createElement("span");
		changedListHeaderPageDelete.classList.add("delete");
		changedListHeaderPageDelete.dataset.soundhover = "";
		changedListHeaderPageDelete.dataset.soundselect = "";
		sounds.applySound(changedListHeaderPageDelete);

		changedListHeaderPage.append(changedListHeaderPageDelete);
		changedListHeader.append(changedListHeaderInfo, changedListHeaderPage);

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
		allListHeaderPage.classList.add("buttonBox");

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

		let pageListSetup = await setup(pageListSetupData, { confirm: "Tiếp", saveKey: "pageList" });

		log("📃 DANH SÁCH TRANG:");

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
					{ name: `Mức Giảm Giá`, color: "pink", value: "sale", checked: true },
					{ name: `Có Mã Giảm Giá`, color: "blue", value: "haveCoupon" },
					{ name: `Giá từ thấp đến cao (<)`, color: "blue", value: "priceUp" },
					{ name: `Giá từ cao đến thấp (>)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số trang quét", value: 1 },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 0 },
			blackList: { type: "textarea", label: "Danh Sách Đen", height: "180px", value: blackList.join(";"), save: false }
		}, { confirm: "Tiếp", saveKey: "preSetup" })

		log("PRE SETUP:");

		for (let key of Object.keys(firstScanSetup))
			if (key !== "blackList")
				log(` + ` + pleft(key, 18, true) + ` = ${firstScanSetup[key]}`);
		
		// Save BlackList
		await saveBlackList(firstScanSetup.blackList.split(";"));

		// Change Layout
		run();

		runInfo({
			status: "Đang Khởi Chạy",
			end: "100%",
			current: "0",
			itemStatus: `Đang quét lần đầu`,
			itemStatusColor: "green",
			dataType: "time",
			checkDetail: "INITIALIZING"
		})

		// Start Scanning Item
		var itemList = await scanItem({
			sortBy: firstScanSetup.sortBy,
			pageCount: firstScanSetup.scanPage,
			saleFilter: firstScanSetup.saleFilter
		}, (p, now, end) => runInfo({
			now: `${p.toFixed(0)}%`,
			current: now,
			target: end,
			progress: p,
			progWarn: false,
			dataType: "time"
		}));

		var CURRENT_PAGE = 1;

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

		changedListHeaderPageDelete.addEventListener("mouseup", e => emptyNode(changedListItem));
		allListHeaderPageForward.addEventListener("mouseup", e => changeAllListPage("last"));
		allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
		allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
		allListHeaderPageBackward.addEventListener("mouseup", e => changeAllListPage(1));
		
		changeAllListPage(CURRENT_PAGE);

		let prevAccountList = (await this.dataLoad("tikiMA.accountList")) || "";

		const settings = await setup({
			checkPriceHistory: { type: "checkbox", label: "Kiểm tra lịch sử giá", color: "blue", value: false },
			autobuy: { type: "checkbox", label: "Tự động mua", color: "pink", value: false, depend: "checkPriceHistory" },
			autobuyRatio: { type: "number", label: "Tỉ lệ", value: 8.5, step: 0.01, depend: "autobuy" },
			autobuyFrom: { type: "number", label: "Giá tối thiểu", value: 0, depend: "autobuy" },
			autobuyCount: { type: "number", label: "Số Lượng Mua", value: 1, depend: "autobuy" },
			autoRebuy: { type: "number", label: "Số Lần Mua Lại", value: 1, depend: "autobuy" },
			checkMaxDeal: { type: "checkbox", label: "Kiểm tra thông tin sale", value: false, depend: "autobuy" },
			itemQtyMinus: { type: "number", label: "Trừ số lượng trong kho", value: 4, depend: "checkMaxDeal" },
			applyCoupon: { type: "checkbox", label: "Áp mã giảm giá nếu có", color: "blue", value: false, depend: "autobuy" },
			paymentMethod: {
				type: "radio",
				label: "Phương Thức Thanh Toán",
				required: true,
				depend: "autobuy",
				list: [
					{ name: `COD`, color: "pink", value: "cod", checked: true },
					{ name: `MOMO`, color: "blue", value: "momo" }
				]
			},
			accountList: { type: "textarea", label: "Danh Sách Tài Khoản", height: "180px", value: prevAccountList, required: true, depend: "autobuy", save: false },
			limitOrder: { type: "checkbox", label: "Giới hạn số lượng mua cho mỗi tài khoản", color: "blue", value: false, depend: "autobuy" },
			limitOrderTime: { type: "number", label: "Thời gian giới hạn (phút)", value: 30, depend: "limitOrder" },
			limitOrderCount: { type: "number", label: "Số lượng mua tối đa trong thời gian giới hạn", value: 5, depend: "limitOrder" },
			xPlatform: { type: "text", label: "X-Platform", value: "frontend-desktop" }
		})

		log("👥 Đang lưu danh sách tài khoản");
		await this.dataSave({ "tikiMA.accountList": settings.accountList });
		var accountList = settings.accountList
			.split("\n")
			.filter(String)
			.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null } });

		var accountOrderCount = {}

		log("🏃‍♂️ Đang bắt đầu chạy...");
		run();
		
		// Start
		var checkPer = 60;
		var startTime = time();
		var start = time();

		var checker = async () => {
			let startCheck = time();
			log("");
			log(`🛫 Bắt đầu kiểm tra (lần ${runNth})`);
			await __doUpdate();
			log(`🛫 KIỂM TRA HOÀN THÀNH`);
			log(` + Thời gian: ${(time() - startCheck).toFixed(2)}s`);

			// Reset
			runNth++;
			start = time();
			runInfo({ background: "dark" });
		}

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
			var changed = 0;
			runInfo({ now: `0`, end: `100%`, progress: 0, checkDetail: "Đang Lấy Danh Sách Item", dataType: "time" });

			await scanItem({
				sortBy: firstScanSetup.sortBy,
				pageCount: firstScanSetup.scanPage,
				saleFilter: firstScanSetup.saleFilter,
				doSort: false,
				printLog: false,
				itemHandler: async (item) => {
					if (itemList.list[item.id] && (itemList.list[item.id].price <= item.price || itemList.list[item.id].sale >= item.sale))
						return;

					runInfo({
						checkDetail: `Item ID ${item.id}`,
						dataType: "time"
					})

					let blackList = await getBlackList();
					if (blackList.indexOf(item.id) !== -1) {
						log(`🏴 ITEM trong BlackList: ${item.id}`);
						return;
					}

					// Increase Counter
					changed++;

					// Send Notifiaction
					let sendNotification = false;

					if (itemList.list[item.id]) {
						log(`🛍 ITEM Thay Đổi: ${item.id} [${changed}]`);
						log(` + GIÁ:  ${itemList.list[item.id].price} -> ${item.price}`);
						log(` + SALE: ${itemList.list[item.id].sale.toFixed(2)}% -> ${item.sale.toFixed(2)}%`);
						sendNotification = true;
					} else {
						log(`🛍 ITEM Mới: ${item.id} [${changed}]`);
						log(` + GIÁ:  ${item.price}`);
						log(` + SALE: ${item.sale.toFixed(2)}%`);
						sendNotification = true;
					}
		
					//? Remove Old Box If Exist
					let existBox = changedListItem.querySelectorAll(`.item[item-id="${item.id}"]`);
					for (let item of existBox)
						deleteNode(item);
					
					let showItemDetail = !settings.checkPriceHistory;

					if (settings.checkPriceHistory) {
						if (item.price < settings.autobuyFrom) {
							log(`🛑 GIÁ ITEM KHÔNG ĐẠT TỐI THIỂU (${item.price} < ${settings.autobuyFrom})`);
							itemList.list[item.id] = item;
							return;
						}

						log(`🐝 Đang kiểm tra lịch sử giá`);
						log(` + ID: ${item.id} PID: ${item.pid}`);
						let beeCost = {}

						try {
							beeCost = await myajax({
								url: `https://apiv2.beecost.com/ecom/product/history`,
								method: "GET",
								query: {
									product_base_id: [3, item.id, item.pid].filter(Number).join("__")
								}
							})
						} catch(e) {
							beeCost = {
								status: "error",
								meta: {
									code: e.code,
									messgae: e.description
								}
							}
						}

						showItemDetail = true;
						
						if (beeCost.status === "error") {
							log("🐝 Không thể lấy lịch sử giá Item");
							log(` + Code : ${beeCost.meta.code || "Không Rõ"}`);
							log(` + MSG  : ${beeCost.meta.message || "Không Rõ"}`);
							log(` + Bỏ qua lỗi: true`);
						} else {
							let costData = beeCost.data.price_classification;
							let min = costData ? costData.min_price : Math.min.apply(this, beeCost.data.item_history.price);
							log(`🐝 GIÁ THẤP NHẤT: ${min}`);

							let priceRatio = min / item.price;
							log(`🐝 PRICE RATIO: ${priceRatio}`);

							if (priceRatio >= settings.autobuyRatio) {
								let orderCount = settings.autobuyCount;

								if (settings.checkMaxDeal) {
									log(`🤝 Đang kiểm tra thông tin Sale`);

									let data = await myajax({
										url: `${HOSTADDRESS}/api/v2/products/${item.id}`,
										method: "GET",
										header: {
											"X-Access-Token": await getToken()
										},
										query: {
											spid: item.pid,
											include: [
												"tag",
												"badges",
												"stock_item",
												"variants",
												"discount_tag"
											].join(",")
										}
									})

									if (data && data.stock_item && data.stock_item.max_sale_qty) {
										let itemQTY = data.stock_item.qty;
										let minSale = data.stock_item.min_sale_qty;
										let maxSale = data.stock_item.max_sale_qty;
										log(`🤝 QTY/MIN/MAX: ${itemQTY}/${minSale}/${maxSale}`);

										let calcCount = Math.min(orderCount, Math.max(itemQTY - settings.itemQtyMinus), maxSale);
										log(`🤝 Số lượng mua tính được: ${calcCount}`);

										if (calcCount < minSale) {
											log(`🤝 🛑 Số lượng tính được nhỏ hơn MIN SALE`);
											calcCount = minSale;
										}

										orderCount = calcCount;
									} else
										log(`🤝 🛑 Không có thông tin Sale`);
								}

								let successCount = 0;
								log(`💠 BẮT ĐẦU ĐẶT MUA`);
								order();

								for (var orderNth = 0; orderNth < accountList.length; orderNth++) {
									let account = accountList[orderNth];
				
									runInfo({
										itemStatus: `Lần Mua ${orderNth + 1}/${accountList.length}`,
										itemStatusColor: "yellow",
										runInfo: `Tài khoản ${account.u}`
									});
									
									heartbeat();
									log(`========== ACCOUNT ${orderNth + 1}/${accountList.length} ==========`);
				
									try {
										for (let time = 1; time <= settings.autoRebuy; time++) {
											log(`---------- LẦN ${time}/${settings.autoRebuy} ----------`);

											if (settings.limitOrder && Math.floor(startTime / (settings.limitOrderTime * 60)) * settings.limitOrderCount > accountOrderCount[_ra.u]) {
												log(`Tài khoản ${account.u} đã mua đủ số lượng\n\t(${accountOrderCount[_ra.u]} lần/${Math.floor((startTime / 60) / settings.limitOrderTime)} phút)`);
												break;
											}

											if (time === 1)
												await __switchAccount({
													username: account.u,
													password: account.p
												});

											sounds.notification();
											await __doOrder({
												id: item.pid,
												count: orderCount,
												coupon: (settings.applyCoupon && item.coupon && item.coupon.code) ? item.coupon.code : "",
												paymentMethod: settings.paymentMethod,
												shippingAddress: account.a
											});

											successCount++;

											if (!accountOrderCount[account.u])
												accountOrderCount[account.u] = 0;

											accountOrderCount[account.u] += settings.autobuyCount;
										}
									} catch(e) {
										heartbeat({ color: "red" });
										log(`💠 Mua thất bại cho tài khoản ${account.u}! (lần ${orderNth + 1})`);
										clog("ERRR", `doOrder ${account.u} [${item.pid}]`, e);

										try {
											log(`🛒 Đang dọn dẹp giỏ hàng`);
											await __clearCart();
										} catch(e) {
											log(`🛒 Không thể xóa Giỏ Hàng`);
											clog("ERRR", e);
										}
										
										continue;
									}

									heartbeat();
									log(`💠 Mua thành công cho tài khoản ${account.u}! (lần ${orderNth + 1})`);
								}

								if (successCount > 0) {
									chrome.notifications.create({
										type: "basic",
										title: "Deal Hunter Suite",
										message: `Đã mua: ${item.title} (${item.id})`,
										contextMessage: `${(time() - start).toFixed(2)}s`,
										iconUrl: "/assets/img/icon@32x32.png",
										requireInteraction: false
									});

									await sendBeacon({
										script: SCRIPT.id,
										name: item.title,
										link: item.link,
										price: item.price,
										count: settings.autobuyCount * successCount,
										oldPrice: item.oldPrice,
										thumbnail: item.thumbnail,
										note: [
											`ID        : ${item.id}`,
											...beaconNote
										].join("\n")
									});
								}

								// LOG OUT OF CURRENT ACCOUNT
								await __switchAccount();

								beaconNote = []
								run();
							}
						}
					}

					itemList.list[item.id] = item;

					if (showItemDetail) {
						let itemBox = createChangedItemBox(item, e => addToBlackList(e.target.getAttribute("item-id")));
						changedListItem.prepend(itemBox);

						if (sendNotification) {
							sounds.notification();
							chrome.notifications.create({
								type: "basic",
								title: "Deal Hunter Suite",
								message: `Đã thêm: ${item.title} [${changed}]`,
								contextMessage: `${(time() - start).toFixed(2)}s`,
								iconUrl: "/assets/img/icon@32x32.png"
							});
						}
					}
				}
			}, (p, now, end) => runInfo({
				now: `${p.toFixed(0)}%`,
				current: now,
				target: end,
				progress: p,
				progWarn: false,
				dataType: "time"
			}) );

			delete changed;

			runInfo({ now: `Bước 2`, progress: 100, progWarn: false, checkDetail: "Thành Công", dataType: "time" });
		}

		//! |===============================|
		//! |       ORDER MAIN LOGIC        |
		//! |===============================|

		const __switchAccount = async ({
			username = null,
			password = null
		} = {}) => {
			let loginTimer = new stopClock();

			heartbeat();
			log(`📤 Đang đăng xuất`);
			runInfo({ now: `Bước 1`, end: `Bước 6`, progress: 0, checkDetail: "Đang đăng xuất" });

			try {
				await myajax({
					url: `${HOSTADDRESS}/api/v2/account/logout`,
					method: "GET",
					header: {
						"X-Access-Token": await getToken()
					}
				});

				log("📤 Đăng xuất thành công");
			} catch(e) {
				clog("ERRR", e);
				log("📤 Không thể đăng xuất! Tool sẽ coi như đăng xuất thành công và tiếp tục chạy!");
				log(` + Code: ${e.code}`);
				log(` + MSG : ${e.description || "Không rõ"}`);
			}

			if (!username || !password)
				return;

			log(`📥 Đang đăng nhập vào \"${username}\"`);
			runInfo({ now: `Bước 2`, progress: 10, checkDetail: "Đang đăng nhập" });
			let loginResponse = {}

			try {
				loginResponse = await myajax({
					url: `${HOSTADDRESS}/customer/account/ajaxLogin`,
					method: "POST",
					form: {
						email: username,
						password: password
					}
				});
			} catch(e) {
				log("📥 Không thể đăng nhập vào tài khoản");
				log(` + Code: ${e.data.data.error.code}`);
				log(` + MSG : ${e.data.data.error.message || "Không rõ"}`);
				
				if (e.data.data.error.errors)
					for (let item of e.data.data.error.errors) {
						log(`  + FIELD   : ${item.field}`);
						log(`  + MESSAGE : ${item.message || "Không rõ"}`);
					}

				throw { code: -1, description: "Thất bại khi đăng nhập vào tài khoản", data: e.data.data }
			}

			if (loginResponse.messages && loginResponse.messages.email) {
				log(`📥 Không thể đăng nhập vào tài khoản \"${username}\"`);
				log(` + MSG : ${loginResponse.messages.email || "Không Rõ"}`);
				throw { code: -1, description: loginResponse.messages.email, data: loginResponse }
			}

			if (loginResponse.messages && loginResponse.messages.password) {
				log(`📥 Không thể đăng nhập vào \"${username}\"`);
				log(` + MSG : ${loginResponse.messages.password || "Không Rõ"}`);
				throw { code: -1, description: loginResponse.messages.password, data: loginResponse }
			}

			log("📤 Cập nhật Cookies 🍪");
			await myajax({
				url: `${HOSTADDRESS}/api/v2/me`,
				method: "GET"
			})

			log(`📥 Đăng nhập thành công (${loginTimer.stop}s)`);
		}

		const addIntoCart = async ({
			id = 0,
			count = 0,
		} = {}) => {
			log(`🛒 Đang thêm Item ${id} C:${count} vào Giỏ Hàng`);
			let addData = {}

			try {
				addData = await myajax({
					url: `${HOSTADDRESS}/api/v2/carts/mine/items`,
					method: "POST",
					header: {
						"X-Access-Token": await getToken()
					},
					json: {
						products: [{
							product_id: id,
							qty: count
						}]
					}
				});
			} catch(e) {
				if (e.code !== 2)
					throw e;
			}
	
			if (addData.error) {
				await errored("Lỗi khi thêm Item vào Giỏ");
				log("⚠ Tiki trả về mã lỗi");
				log(` + MSG : ${addData.error.message || "Không rõ"}`);
				throw { code: -1, description: "Không thể thêm Item vào Giỏ: " + addData.error.message, data: addData.error }
			}

			log("🛒 Thêm vào giỏ thành công!");
		}
		
		const __doOrder = async ({
			id = 0,
			count = 0,
			coupon = "",
			itemInit = true,
			paymentMethod = "cod",
			shippingAddress = null,
			isInjectedAccount = false
		}) => {
			sounds.notification();
			let orderTimer = new stopClock();

			if (itemInit) {
				runInfo({ now: `Bước 1`, end: `Bước 4`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
				heartbeat();
				await addIntoCart({ id: id, count: count });
				heartbeat();
	
				if (coupon !== "") {
					runInfo({ progress: 20, checkDetail: "Đang Áp Dụng Mã Giảm Giá" });
	
					log(`🎫 Đang áp dụng Coupon: ${coupon}`)
					await myajax({
						url: `${HOSTADDRESS}/checkout/cart/ajaxCoupon`,
						method: "POST",
						form: {
							coupon_code: coupon
						}
					})
	
					log(`🎫 Áp dụng Coupon thành công!`);
				}
			}
			
			heartbeat();
			runInfo({ now: `Bước 2`, progress: 30, checkDetail: "Đang chọn địa chỉ Giao Hàng" });
			log(`🏡 Đang chọn địa chỉ Giao Hàng`);
			let shippingID = shippingAddress;

			if (!shippingID) {
				log(`🏡 Đang lấy thông tin địa chỉ`);
				let addressBook = await myajax({
					url: `${HOSTADDRESS}/api/v2/me/addresses`,
					method: "GET",
					header: {
						"X-Access-Token": await getToken(),
						apikey: null
					},
					query: {
						page: 1,
						limit: 30
					}
				})

				if (addressBook.error) {
					await errored("Lỗi khi lấy ID Địa Chỉ");
					log("⚠ Tiki trả về mã lỗi");
					log(` + Code : ${addressBook.error.code}`);
					log(` + MSG  : ${addressBook.error.message}`);
					throw { code: addressBook.error.code, description: addressBook.error.message, data: addressBook.error }
				}
	
				heartbeat();
				runInfo({ progress: 50, progWarn: false });
				log(`🏡 Đang phân tích thông tin`);
				
				shippingID = addressBook.data.filter(i => (i.is_default && i.id));

				if (!shippingID[0]) {
					await errored("Lỗi khi lấy ID Địa Chỉ");
					log("🏡 Không tìm thấy địa chỉ mặc định");
					throw { code: -1, description: "Không tìm thấy địa chỉ mặc định", data: addressBook.data }
				}

				shippingID = shippingID[0].id;
			}

			log(`🏡 Đang chọn địa chỉ ID: ${shippingID}`);
			heartbeat();

			let applyAddress = await myajax({
				url: `${HOSTADDRESS}/api/v2/carts/mine/shippings_addresses/${shippingID}`,
				method: "PUT",
				header: {
					"X-Access-Token": await getToken()
				}
			})
			
			if (applyAddress.error) {
				await errored("Lỗi khi áp dụng Địa Chỉ");
				log("⚠ Tiki trả về mã lỗi");
				log(` + Code: ${applyAddress.error.code}`);
				log(` + MSG : ${applyAddress.error.message || "Không Rõ"}`);
				throw { code: -1, description: "Không thể chọn địa chỉ", data: applyAddress.error }
			}

			runInfo({ now: `Bước 3`, progress: 60, progWarn: false, checkDetail: "Thay đổi cài đặt thanh toán" });
			log(`🛒 Đang lấy thông tin Thanh Toán`);
			heartbeat();

			let doCartVerify = false;

			let cartInfo = await myajax({
				url: `${HOSTADDRESS}/api/v2/carts/mine`,
				method: "GET",
				header: {
					"X-Access-Token": await getToken()
				},
				query: {
					include: [
						"items",
						"shipping_address",
						"messages",
						"price_summary",
						"shipping_methods",
						"last_payment_method",
						"payment_methods"
					].join(",")
				}
			})

			if (cartInfo.error) {
				await errored("Lỗi khi lấy Giỏ Hàng");
				log("⚠ Tiki trả về mã lỗi");
				log(` + Code: ${cartInfo.error.code}`);
				log(` + MSG : ${cartInfo.error.message || "Không Rõ"}`);
				throw { code: -1, description: "Không thể lấy Giỏ Hàng", data: cartInfo.error }
			}

			cartInfo.last_payment_method = cartInfo.payment_methods.filter(i => i.selected)[0];
			
			if (!cartInfo.last_payment_method || cartInfo.last_payment_method.method !== paymentMethod) {
				log(`🛒 Đang chuyển sang: ${paymentMethod}`);
				heartbeat();

				let changeMethod = {}

				try {
					changeMethod = await myajax({
						url: `${HOSTADDRESS}/api/v2/carts/mine/payment_methods/${paymentMethod}`,
						method: "PUT",
						type: "text",
						header: {
							"X-Access-Token": await getToken()
						}
					})
				} catch(e) {
					await errored("Lỗi khi thay đổi phương thức thanh toán");
					log(`⚠ Lỗi khi gửi yêu cầu`);
					log(` + Code: ${e.code}`);
					log(` + MSG : ${e.message || "Không Rõ"}`);
					throw { code: -1, description: "Không thể đổi phương thức thanh toán", data: e }
				}

				if (changeMethod.error) {
					await errored("Lỗi khi thay đổi phương thức thanh toán");
					log("⚠ Tiki trả về mã lỗi");
					log(` + Code: ${changeMethod.error.code}`);
					log(` + MSG : ${changeMethod.error.message || "Không Rõ"}`);
					throw { code: -1, description: "Không thể đổi phương thức thanh toán", data: changeMethod.error }
				}

				doCartVerify = true;
			} else
				log(`🛒 Phương thức thanh toán: ${cartInfo.last_payment_method.method_name}`);

			for (let item of cartInfo.shipping_methods)
				if (item.id === 3 && item.is_disabled === false) {
					log(`🕑 Phát hiện Tiki Now!`);
					log(` + Code: ${item.code}`);
					log(` + Name: ${item.name}`);
					log(` + Est : ${item.estimation_text}`);
					log(` + Fee : ${item.shipping_fee}`);

					if (item.is_selected !== true) {
						log(`🕑 Đang chuyển sang Tiki Now`);
						heartbeat();

						let shipPlan = {}

						try {
							shipPlan = await myajax({
								url: `${HOSTADDRESS}/api/v2/carts/mine/shippings_plans/${item.id}`,
								method: "PUT",
								type: "text",
								header: {
									"X-Access-Token": await getToken()
								}
							})
						} catch(e) {
							await errored("Lỗi khi chuyển sang Tiki Now");
							log(`⚠ Lỗi khi gửi yêu cầu`);
							log(` + Code: ${e.code}`);
							log(` + MSG : ${e.message || "Không Rõ"}`);
							throw { code: -1, description: "Không thể chuyển sang Tiki Now", data: e }
						}

						if (shipPlan.error) {
							await errored("Lỗi khi chuyển sang Tiki Now");
							log("⚠ Tiki trả về mã lỗi");
							log(` + Code: ${shipPlan.error.code}`);
							log(` + MSG : ${shipPlan.error.message || "Không Rõ"}`);
							throw { code: -1, description: "Không thể chuyển sang Tiki Now", data: shipPlan.error }
						}

						doCartVerify = true;
					}

					break;
				}

			log(`🛒 Đã Áp Dụng Cài Đặt`);
			heartbeat({ color: "green" });

			if (doCartVerify) {
				log(`🛒 Đang xác thực thông tin`);
				heartbeat();

				cartInfo = await myajax({
					url: `${HOSTADDRESS}/api/v2/carts/mine`,
					method: "GET",
					header: {
						"X-Access-Token": await getToken()
					},
					query: {
						include: [
							"items",
							"shipping_address",
							"messages",
							"price_summary",
							"shipping_methods",
							"last_payment_method",
							"payment_methods"
						].join(",")
					}
				})

				cartInfo.last_payment_method = cartInfo.payment_methods.filter(i => i.selected)[0];

				if (!cartInfo.last_payment_method || cartInfo.last_payment_method.method !== paymentMethod) {
					await errored("Lỗi khi thay đổi phương thức thanh toán");
					log(`⚠ Xác thực lại không khớp`);
					log(` + Current : ${cartInfo.last_payment_method.method}`);
					log(` + Expected: ${paymentMethod}`);
					throw { code: -1, description: "Không thể đổi phương thức thanh toán", data: cartInfo.last_payment_method }
				}

				for (let item of cartInfo.shipping_methods)
					if (item.id === 3 && item.is_disabled === false && item.is_selected !== true) {
						await errored("Lỗi khi chuyển sang Tiki Now");
						log(`⚠ Xác thực lại không khớp`);
						log(` + Current : ${cartInfo.shipping_method.name}`);
						log(` + Expected: TikiNOW Giao Nhanh`);
						throw { code: -1, description: "Không thể chuyển sang Tiki Now" }
					}

				log(`🛒 Xác thực thành công`);
			}

			log(` + ID         : ${cartInfo.id}`);
			log(` + CID        : ${cartInfo.customer_id}`);
			log(` + Coupon     : ${cartInfo.coupon_code || "Không Có"}`);
			log(` + Thanh toán : ${cartInfo.last_payment_method.method_name}`);
			log(` + Giao hàng  : ${cartInfo.shipping_method.name} (${cartInfo.shipping_method.code}) [${cartInfo.shipping_method.id}]`);
			log(`----------------------------------------`);
			log(`💵 Tạm tính   : <a class="price">${priceFormat(cartInfo.subtotal)}</a>`);
			log(`💵 Vận chuyển : <a class="price">${priceFormat(cartInfo.shipping_amount)}</a>`);
			log(`💵 THÀNH TIỀN : <a class="price" style="font-size: 26px;">${priceFormat(cartInfo.grand_total)}</a>`);

			runInfo({ now: `Bước 4`, progress: 80, progWarn: false, checkDetail: "Bắt đầu đặt hàng" });
			log(`🛒 Đang tiến hành đặt hàng`);
			heartbeat();

			let placeOrder = await myajax({
				url: `${HOSTADDRESS}/api/v2/carts/mine/checkout`,
				method: "POST",
				header: {
					"X-Access-Token": await getToken(),
					"X-Platform": settings.xPlatform
				},
				json: {
					cybersource_information: {},
					payment: { method: paymentMethod, option_id: null },
					tax_info: null
				}
			})

			if (placeOrder.error) {
				await errored("Lỗi khi tiến hành Đặt Hàng");
				log("⚠ Tiki trả về mã lỗi");
				log(` + Code: ${placeOrder.error.code}`);
				log(` + MSG : ${placeOrder.error.message || "Không Rõ"}`);
				throw { code: -1, description: "Không thể tiến hành Order", data: placeOrder.error }
			}

			runInfo({ progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công" });
			heartbeat();

			if (isInjectedAccount) {
				log("⚠ Tiki trả về mã lỗi");
				log(` + Code: 450`);
				log(` + MSG : Giỏ hàng của bạn hiện đang trống!`);

				beaconNote.push(`🛒 ID ${placeOrder.redirect_data.order_code} [Tài Khoản Chèn]`);
				beaconNote.push(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);
	
				if (paymentMethod === "momo") {
					beaconNote.push(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
					beaconNote.push(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
					beaconNote.push(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
				}
			} else {
				log("🛒 doOrder đã hoàn thành!");
				log("=============== KẾT QUẢ ===============");
				log(` + Order Code    : ${placeOrder.redirect_data.order_code}`);
				log(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);
	
				beaconNote.push(`🛒 ID ${placeOrder.redirect_data.order_code}`);
				beaconNote.push(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);
	
				if (paymentMethod === "momo") {
					log(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
					log(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
					
					log(` + payURL        : <a href="${placeOrder.qr_code}" target="_blank">LINK</a>`);
					log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
	
					beaconNote.push(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
					beaconNote.push(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
				}
			}

			log(`⌚ Thời gian     : ${orderTimer.stop}s`);
		}

		const __clearCart = async () => {
			heartbeat();
			log(`🛒 Đang lấy danh sách giỏ hàng`);
			runInfo({ now: `Bước 1`, end: `Bước 6`, progress: 0, checkDetail: "Đang lấy danh sách" });

			let cartList = await myajax({
				url: `${HOSTADDRESS}/api/v2/carts/mine`,
				method: "GET",
				header: {
					"X-Access-Token": await getToken()
				},
				query: {
					include: [
						"items",
						"badges",
						"payment_method",
						"messages",
						"price_summary"
					].join(",")
				}
			});

			if (cartList.error) {
				await errored("Lỗi khi lấy thông tin Giỏ Hàng");
				log("⚠ Tiki trả về mã lỗi");
				log(` + Code: ${cartList.error.code}`);
				log(` + MSG : ${cartList.error.message || "Không Rõ"}`);
				throw { code: -1, description: "Không thể lấy thông tin Giỏ Hàng", data: cartList.error }
			}

			heartbeat();
			log(`🛒 ${cartList.items.length} item hiện trong giỏ hàng`);

			for (let item of cartList.items) {
				log(`🛒 Đang xóa ${item.product_name} (${item.id})`);

				try {
					await myajax({
						url: `${HOSTADDRESS}/api/v2/carts/mine/items/${item.id}`,
						method: "DELETE",
						header: {
							"X-Access-Token": await getToken()
						}
					})
				} catch(e) {
					if (e.code !== 2) {
						heartbeat({ color: "red" });

						log("🛒 Không thể xóa Item khỏi Giỏ");
						log(` + ID  : ${item.id}`);
						log(` + Code: ${e.code}`);
						log(` + MSG : ${e.description || "Không rõ"}`);
						log(` + Bỏ qua lỗi: true`);
	
						clog("ERRR", `Remove Cart ${item.id}`, e);
						continue;
					}
				}

				heartbeat({ color: "blue" });
				log(`🛒 Xóa thành công`);
			}
		}

		log("Bắt đầu chạy");
		__checkHandler();
	} catch(e) {
		triggerError(e);
		return;
	}
})()