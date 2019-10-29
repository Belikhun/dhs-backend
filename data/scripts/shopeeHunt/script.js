// Script begin here
(async () => {
	var doCheck = true;
	var infoUpdateInterval = null;
	var timeUpdateInterval = null;

	const HOSTADDRESS = "https://shopee.vn/api/v2/recommend_items/get";
	var selectedPageList = []
	const pageList = {
		popular:		{ title: "Phổ biến", id: -2 },
		moms:			{ title: "Mẹ & Bé", id: 163 },
		housewares:		{ title: "Nhà Cửa & Đời Sống", id: 87 },
		phoneTablet:	{ title: "Điện Thoại & Phụ Kiện", id: 84 },
		menFashion:		{ title: "Thời Trang Nam", id: 78 },
		womenFashion:	{ title: "Thời Trang Nữ", id: 77 },
		wallet:			{ title: "Túi Ví", id: 162 },
		electronic:		{ title: "Thiết Bị Điện Tử", id: 2365 },
		womenShoes:		{ title: "Giày Dép Nữ", id: 161 },
		menShoes:		{ title: "Giày Dép Nam", id: 2429 },
		toys:			{ title: "Đồ Chơi", id: 13242 },
		watches:		{ title: "Đồng Hồ", id: 9607 },
		fashion:		{ title: "Phụ Kiện Thời Trang", id: 80 },
		household:		{ title: "Thiết Bị Điện Gia Dụng", id: 2353 },
		stationery:		{ title: "Nhà Sách Online", id: 10256 },
		computer:		{ title: "Máy tính & Laptop", id: 13030 },
		cars:			{ title: "Ô tô - xe máy - xe đạp", id: 12494 },
		homeCares:		{ title: "Giặt giũ & Chăm sóc nhà cửa", id: 17101 },
		babyFashion:	{ title: "Thời Trang Trẻ Em", id: 16770 },
		sports:			{ title: "Thể Thao & Du Lịch", id: 9675 },
		beauty:			{ title: "Sức Khỏe & Sắc Đẹp", id: 160 },
		camera:			{ title: "Máy ảnh - Máy quay phim", id: 13033 },
		consumerGood:	{ title: "Bách Hoá Online", id: 9824 },
		petCares:		{ title: "Chăm sóc thú cưng", id: 18977 },
		voucher:		{ title: "Voucher & Dịch vụ", id: 12938 }
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
		log(`|     Shopee Deal Hunter    |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 19:20:12 29/10/2019  |`);
		log(`|===========================|`);

		const getBlackList = async () => {
			let data = await this.dataLoad("shopeeHuntBlackList");
			return Object.keys(data.shopeeHuntBlackList || {});
		}

		const saveBlackList = async (list) => {
			let listObj = {}
			for (let i of list)
				if (!isNaN(i) && i !== "")
					listObj[i] = true;

			await this.dataSave({ shopeeHuntBlackList: listObj });
		}

		const scanItem = async (sortBy = "sale", listLimit = 60, recommendType = 6) => {
			let list = {}
			let sortedList = []
			let blackList = await getBlackList();

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy        = ${sortBy}`);
			log(`   + listLimit     = ${listLimit}`);
			log(`   + recommendType = ${recommendType}`);

			for (let item of selectedPageList) {
				let start = time();
				log(`   + Đang tải: ${item.title}`);

				heartbeat({ color: "yellow" });
				let result = await myajax({
					url: HOSTADDRESS,
					method: "GET",
					query: {
						catid: item.id,
						limit: listLimit,
						offset: 0,
						recommend_type: recommendType
					},
					type: "json"
				});

				heartbeat();

				for (let item of result.data.items) {
					if (list[item.itemid] || blackList.indexOf(item.itemid) !== -1)
						continue;

					let link = `https://shopee.vn/product-i.${item.shopid}.${item.itemid}`;
					let thumbnail = `https://cf.shopee.vn/file/${item.image}`;

					let price = item.price / 100000;
					let oldPrice = item.price_before_discount / 100000 || price;
					let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;

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
						sale: couponSale || priceSale
					}

					sortedList.push(list[item.itemid]);
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
					sortedList.sort((a, b) => (a.price < b.price) ? 1 : (a.title > b.price) ? -1 : 0);
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
			recommendType: {
				type: "radio",
				label: "Loại Item",
				required: false,
				list: [
					{ name: `Shopee Mall`, color: "pink", value: 6, checked: true },
					{ name: `Cả Shopee và Shopee Mall`, color: "blue", value: 5 },
					{ name: `Loại Đề Nghị 4`, color: "blue", value: 4 },
					{ name: `Loại Đề Nghị 3`, color: "blue", value: 3 },
					{ name: `Loại Đề Nghị 2`, color: "blue", value: 2 },
					{ name: `Loại Đề Nghị 1`, color: "blue", value: 1 }
				]
			},
			fetchCount: { type: "number", label: "Số Lượng Item Lấy Mỗi Loại", value: 1000 },
			blackList: { type: "textarea", label: "Danh Sách Đen", height: "160px", value: blackList.join(";") }
		}, { confirm: "Tiếp" })

		log("PRE SETUP:");

		for (let key of Object.keys(firstScanSetup))
			log(` + ` + pleft(key, 18, true) + ` = ${firstScanSetup[key]}`);
		
		// Save BlackList
		await saveBlackList(firstScanSetup.blackList.split(";"));

		// Start Scanning Item
		var itemList = await scanItem(firstScanSetup.sortBy, firstScanSetup.fetchCount, firstScanSetup.recommendType);
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
			let list = await scanItem(firstScanSetup.sortBy, firstScanSetup.fetchCount, firstScanSetup.recommendType);

			runInfo({ now: `Bước 2`, progress: 50, progWarn: false, checkDetail: "Đang So Sánh Thông Tin" });
			let changed = 0;
			let changedList = []

			for (let item of list.sortedList) {
				if (itemList.list[item.id] && itemList.list[item.id].price <= item.price && itemList.list[item.id].sale >= item.sale)
					continue;

				let blackList = await getBlackList();
				if (blackList.indexOf(item.id) !== -1) {
					log(` + ITEM trong BlackList: ${item.id}`);
					continue;
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

		__checkHandler();
		log("Bắt đầu chạy");
	} catch(e) {
		triggerError(e);
		return;
	}
})()