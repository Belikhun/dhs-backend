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
		log(`|  LU: 00:13:48 18/03/2020  |`);
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
			saleFilter = 0,
			doSort = true,
			itemHandler = () => {}
		} = {}, set = () => {}) => {
			let list = {}
			let sortedList = []
			let blackList = await getBlackList();

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy    = ${sortBy}`);
			log(`   + pageCount = ${pageCount}`);

			for (let itemNth = 0; itemNth < selectedPageList.length; itemNth++) {
				let item = selectedPageList[itemNth];
				let start = time();

				log(`   + Đang tải: ${item.title}`);
				
				for (let page = 1; page <= pageCount; page++) {
					var result = {}
					heartbeat({ color: "yellow" });

					try {
						result = await myajax({
							url: HOSTADDRESS + item.path,
							method: "GET",
							query: {
								src: "mega-menu",
								order: "discount_percent,desc",
								page: page
							},
							type: "text"
						});
					} catch(e) {
						heartbeat({ color: "red" });
						log(" + Lỗi đã xảy ra khi lấy danh sách Item");
						log(`    + Code: ${e.code}`);
						log(`    + MSG : ${e.description || "Không Rõ"}`);
						log(`    + Bỏ qua lỗi: true`);

						continue;
					}

					// Calc progress
					let now = (itemNth * pageCount + page);
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

						let link = item.querySelector("a[data-id]").href;
						let thumbnail = item.querySelector("a > div.content > span.image > img.product-image").src;
	
						let price = parseInt(item.dataset.price);
						let _priceBox = item.querySelector("a > div.content > p.price-sale > span.price-regular").innerText;
						let oldPrice = (_priceBox !== "") ? parseInt(_priceBox.match(/\d/g).join("")) : price;
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

						// Item Handling Function
						await itemHandler(list[item.dataset.id]);
	
						if (doSort)
							sortedList.push(list[item.dataset.id]);
					}

					delete result;
				}
				
				log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);
			}

			log(`   + Lấy danh sách thành công`);

			if (doSort) {
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
					{ name: `Tên`, color: "blue", value: "name" },
					{ name: `Mức giảm giá`, color: "pink", value: "sale", checked: true },
					{ name: `Có mã giảm giá`, color: "blue", value: "haveCoupon" },
					{ name: `Giá item (nhỏ đến lớn)`, color: "blue", value: "priceUp" },
					{ name: `Giá item (lớn đến nhỏ)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số Trang Quét Mỗi Loại", value: 1 },
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

		const settings = await setup({
			delay: { type: "number", label: "Thời Gian Nghỉ", value: 10 }
		})

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
				this.script.status.container.dataset.triColor = "dark";
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
			var changed = 0;
			runInfo({ now: `0`, end: `100%`, progress: 0, checkDetail: "Đang Lấy Danh Sách Item", dataType: "time" });

			await scanItem({
				sortBy: firstScanSetup.sortBy,
				pageCount: firstScanSetup.scanPage,
				saleFilter: firstScanSetup.saleFilter,
				doSort: false,
				itemHandler: async (item) => {
					if (itemList.list[item.id] && (itemList.list[item.id].price <= item.price || itemList.list[item.id].sale >= item.sale))
						return;

					let blackList = await getBlackList();
					if (blackList.indexOf(item.id) !== -1) {
						log(` + ITEM trong BlackList: ${item.id}`);
						return;
					}

					// Increase Counter
					changed++;

					// Send Notifiaction
					sounds.notification();

					if (itemList.list[item.id]) {
						log(`   + ITEM Thay Đổi: ${item.id} [${changed}]`);
						log(`     + GIÁ:  ${itemList.list[item.id].price} -> ${item.price}`);
						log(`     + SALE: ${itemList.list[item.id].sale.toFixed(2)}% -> ${item.sale.toFixed(2)}%`);

						chrome.notifications.create({
							type: "basic",
							title: "Deal Hunter Suite",
							message: `Đã thay đổi: ${item.title} [${changed}]`,
							contextMessage: `${(time() - start).toFixed(2)}s`,
							iconUrl: "/assets/img/icon@32x32.png"
						});
					} else {
						log(`   + ITEM Mới: ${item.id} [${changed}]`);
						log(`     + GIÁ:  ${item.price}`);
						log(`     + SALE: ${item.sale.toFixed(2)}%`);

						chrome.notifications.create({
							type: "basic",
							title: "Deal Hunter Suite",
							message: `Đã thêm: ${item.title} [${changed}]`,
							contextMessage: `${(time() - start).toFixed(2)}s`,
							iconUrl: "/assets/img/icon@32x32.png"
						});
					}
		
					//? Remove Old Box If Exist
					let existBox = changedListItem.querySelectorAll(`.item[item-id="${item.id}"]`);
					for (let item of existBox)
						deleteNode(item);
					
					let itemBox = createChangedItemBox(item, e => addToBlackList(e.target.getAttribute("item-id")));
					changedListItem.prepend(itemBox);
					itemList.list[item.id] = item;
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

		__checkHandler();
		log("Bắt đầu chạy");
	} catch(e) {
		triggerError(e);
		return;
	}
})()