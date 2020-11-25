// Script begin here
(async () => {
	var runNth = 1;
	var doCheck = true;
	var beaconNote = []
	var timeUpdateInterval = null;

	var selectedPageList = []
	const pageList = {
		phoneTablet:	{ title: "Điện Thoại - Máy Tính Bảng", path: "dien-thoai-may-tinh-bang", category: 1789 },
		electronic:		{ title: "Điện Tử - Điện Lạnh", path: "dien-tu-dien-lanh", category: 4221 },
		accessories:	{ title: "Phụ Kiện - Thiết Bị Số", path: "thiet-bi-kts-phu-kien-so", category: 1815 },
		laptopIT:		{ title: "Laptop - Thiết Bị IT", path: "laptop-may-vi-tinh-linh-kien", category: 1846 },
		camera:			{ title: "Máy Ảnh - Quay Phim", path: "may-anh", category: 1801 },
		household:		{ title: "Điện Gia Dụng", path: "dien-gia-dung", category: 1882 },
		housewares:		{ title: "Nhà Cửa - Đời Sống", path: "nha-cua-doi-song", category: 1883 },
		consumerGood:	{ title: "Hàng Tiêu Dùng - Thực Phẩm", path: "bach-hoa-online", category: 4384 },
		toys:			{ title: "Đồ Chơi - Mẹ & Bé", path: "do-choi-me-be", category: 2549 },
		beauty:			{ title: "Làm Đẹp - Sức Khỏe", path: "lam-dep-suc-khoe", category: 1520 },
		fashion:		{ title: "Thời Trang - Phụ Kiện", path: "thoi-trang", category: 914 },
		sports:			{ title: "Thể Thao - Dã Ngoại", path: "the-thao-da-ngoai", category: 1975 },
		cars:			{ title: "Ô Tô, Xe Máy, Xe Đạp", path: "o-to-xe-may-xe-dap", category: 8594 },
		stationery:		{ title: "Sách, VPP & Quà Tặng", path: "nha-sach-tiki", category: 8322 },
		international:	{ title: "Hàng Quốc Tế", path: "hang-quoc-te", category: 17166 },
	}

	onCancel(() => {
		this.subScreen.hide();
		clearInterval(timeUpdateInterval);
		doCheck = false;
	});

	const log = (text) => writeLog(text);
	const errored = () => {}

	try {
		log(`|===========================|`);
		log(`|    Tiki Deal Hunter Pro   |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 19:40:30 19/05/2020  |`);
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
			itemPerPage = 48,
			scanSort = "discount_percent,desc",
			aggregations = true,
			saleFilter = 0,
			doSort = true,
			printLog = true,
			itemHandler = async () => {}
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
				let token = await getToken();

				runInfo({
					itemStatus: `[${runNth}] ${item.title}`,
					itemStatusColor: "green",
					dataType: "time"
				});
				
				await new Promise((resolve, reject) => {
					for (let page = 1; page <= pageCount; page++) {
						heartbeat({ color: "yellow" });

						myajax({
							url: `${HOSTADDRESS}/api/v2/products`,
							method: "GET",
							header: {
								"X-Access-Token": token
							},
							query: {
								limit: itemPerPage,
								include: "",
								aggregations: aggregations + 0,
								category: item.category,
								page,
								src: "c.1789.hamburger_menu_fly_out_banner",
								sort: scanSort,
								urlKey: item.path
							}
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
							
							for (let item of result.data) {
								if (list[item.id] || blackList.indexOf(item.id) !== -1)
									continue;

								let link = "https://tiki.vn/" + item.url_path;
								let thumbnail = item.thumbnail_url;
			
								let price = item.price;
								let oldPrice = item.list_price;
								let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;
			
								if (priceSale < saleFilter)
									continue;

								let couponCode = null;
								let couponPrice = null;
								let couponSale = null;
			
								if (typeof item.badges === "object")
									for (let badge of item.badges)
										if (badge.code === "tag") {
											couponCode = badge.tag_coupon_code;
											couponPrice = badge.discount;
											couponSale = ((oldPrice - couponPrice) / oldPrice) * 100;
										}
			
								list[item.id] = {
									id: item.id,
									pid: item.seller_product_id,
									sku: item.sku,
									title: item.name,
									brand: item.brand_name,
									link: link,
									price,
									priceSale,
									thumbnail,
									oldPrice,
									stock: { min: item.stock_item.min_sale_qty, max: item.stock_item.max_sale_qty, qty: item.stock_item.qty },
									coupon: { code: couponCode, price: couponPrice, sale: couponSale },
									sale: couponSale || priceSale
								}
			
								if (doSort)
									sortedList.push(list[item.id]);

								pageList.push(list[item.id]);
							}

							delete result;

							if (pageLoaded >= pageCount)
								resolve();
						})
				}});

				for (let item of pageList)
					await itemHandler(item);
				
				runInfo({
					checkDetail: `Lần quét vừa rồi dài ${(time() - start).toFixed(2)}s`,
					dataType: "time"
				});
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
					{ name: `T`, color: "blue", value: "name" },
					{ name: `MGG`, color: "pink", value: "sale", checked: true },
					{ name: `CMGG`, color: "blue", value: "haveCoupon" },
					{ name: `G (<)`, color: "blue", value: "priceUp" },
					{ name: `G (>)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số trang quét", value: 1 },
			itemPerPage: { type: "number", label: "Số item mỗi trang", value: 48 },
			scanSort: { type: "text", label: "Sắp xếp", value: "discount_percent,desc" },
			aggregations: { type: "checkbox", label: "Tổng hợp", value: true },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 0 },
			blackList: { type: "textarea", label: "Danh Sách Đen", height: "180px", value: blackList.join(";"), save: false }
		}, { confirm: "Tiếp", saveKey: "preSetup" });

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
			saleFilter: firstScanSetup.saleFilter,
			itemPerPage: firstScanSetup.itemPerPage,
			scanSort: firstScanSetup.scanSort,
			aggregations: firstScanSetup.aggregations
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

		let prevAccountList = (await this.dataLoad("tikiMA.accountList"))["tikiMA.accountList"] || "";

		const settings = await setup({
			checkPriceHistory: { type: "checkbox", label: "Kiểm tra lịch sử giá", color: "blue", value: false },
			autobuy: { type: "checkbox", label: "Tự động mua", color: "pink", value: false, depend: "checkPriceHistory" },
			autobuyRatio: { type: "number", label: "Tỉ lệ", value: 8.5, step: 0.01, depend: "autobuy" },
			autobuyFrom: { type: "number", label: "Giá tối thiểu", value: 0, depend: "autobuy" },
			autobuyCount: { type: "number", label: "Số Lượng Mua", value: 1, depend: "autobuy" },
			autoRebuy: { type: "number", label: "Số Lần Mua Lại", value: 1, depend: "autobuy" },
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
		let accountList = settings.accountList
			.split("\n")
			.filter(String)
			.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null } });

		let accountOrderCount = {}
		
		// INJECT CUSTOM ACCOUNT
		let injectList = []
		let injectPos = 0;

		try {
			let _ca = await myajax({
				url: SERVER_ADDR() + API.server,
				method: "GET"
			})

			_ca = _ca.data.config.accountList;

			if (!_ca) {
				rejectSetup("Phiên không hợp lệ! Vui lòng khởi động lại tool");
				return;
			}

			let _cad = CryptoJS.AES.decrypt(
				{ ciphertext: CryptoJS.enc.Base64.parse(_ca.list) },
				CryptoJS.HmacSHA256(this.session.keyData.key + _ca.iv, this.session.token),
				{
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7,
					iv: CryptoJS.enc.Hex.parse(_ca.iv)
				}
			);

			injectList = JSON.parse(_cad.toString(CryptoJS.enc.Utf8))
				.filter(String)
				.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null, h: true } });
		} catch(e) {
			clog("ERRR", "accountList validate error", e);
			throw e;
		}

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
				itemPerPage: firstScanSetup.itemPerPage,
				scanSort: firstScanSetup.scanSort,
				aggregations: firstScanSetup.aggregations,
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

						if (beeCost.status === "error") {
							log("🐝 Không thể lấy lịch sử giá Item");
							log(` + Code : ${beeCost.meta.code || "Không Rõ"}`);
							log(` + MSG  : ${beeCost.meta.message || "Không Rõ"}`);
							log(` + Bỏ qua lỗi: true`);

							showItemDetail = true;
						} else {
							let costData = beeCost.data.price_classification;
							let min = costData ? costData.min_price : Math.min.apply(this, beeCost.data.item_history.price);
							log(`🐝 GIÁ THẤP NHẤT: ${min}`);

							let priceRatio = min / item.price;
							log(`🐝 PRICE RATIO: ${priceRatio}`);

							if (priceRatio >= settings.autobuyRatio) {
								showItemDetail = true;
								let localAccountList = [ ...accountList ]

								if (injectList.length > 0) {
									localAccountList.unshift(injectList[injectPos]);
									injectPos++;

									if (injectPos > injectList.length - 1)
										injectPos = 0;
								}

								let successCount = 0;
								log(`💠 BẮT ĐẦU ĐẶT MUA`);
								order();

								for (var orderNth = 0; orderNth < localAccountList.length; orderNth++) {
									let account = localAccountList[orderNth];
				
									runInfo({
										itemStatus: `Lần Mua ${orderNth + 1}/${localAccountList.length}`,
										itemStatusColor: "yellow",
										runInfo: `Tài khoản ${account.h ? (orderNth + 1) : account.u}`
									});

									heartbeat();
									log(`========== ACCOUNT ${orderNth + 1}/${localAccountList.length} ==========`);
				
									try {
										for (let t = 1; t <= settings.autoRebuy; t++) {
											let timeNow = time();
											log(`---------- LẦN ${t}/${settings.autoRebuy} ----------`);

											if (
												(settings.limitOrder || account.h)
												&& accountOrderCount[account.u]
												&& (accountOrderCount[account.u] / (timeNow - startTime)) > (settings.limitOrderCount / (settings.limitOrderTime * 60))
											) {
												log(`Tài khoản ${(account.h) ? `thứ ${orderNth + 1}` : account.u} đã mua đủ số lượng\n\t(${accountOrderCount[account.u]} lần/${Math.floor((timeNow - startTime) / 60)} phút)`);
												break;
											}

											if (t === 1)
												await __switchAccount({
													username: account.u,
													password: account.p,
													hide: account.h || false
												});

											sounds.notification();
											await __doOrder({
												id: item.pid,
												count: settings.autobuyCount,
												paymentMethod: settings.paymentMethod,
												isInjectedAccount: account.h || false
											})

											successCount++;

											if (!accountOrderCount[account.u])
												accountOrderCount[account.u] = 0;

											accountOrderCount[account.u] += settings.autobuyCount;
										}
									} catch(e) {
										heartbeat({ color: "red" });

										if (account.h) {
											log(`💠 Mua thất bại! (lần ${orderNth + 1})`);
											clog("ERRR", `doOrder [${item.pid}]`, e);
										} else {
											log(`💠 Mua thất bại cho tài khoản ${account.u}! (lần ${orderNth + 1})`);
											clog("ERRR", `doOrder ${account.u} [${item.pid}]`, e);
										}

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

									if (account.h)
										log(`💠 Mua thành công! (lần ${orderNth + 1})`);
									else
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

		log("Bắt đầu chạy");
		__checkHandler();
	} catch(e) {
		triggerError(e);
		return;
	}
})()