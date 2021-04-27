// Script begin here
(async () => {
	var halt = false;
	var infoUpdateInterval = null;
	var timeUpdateInterval = null;

	const HOSTADDRESS = "https://www.lazada.vn";
	var selectedPageList = []
	const pageList = {
		phone:		{ title: "Điện thoại di động", path: "/dien-thoai-di-dong" },
		tablet:		{ title: "Máy tính bảng", path: "/may-tinh-bang" },
		laptop:		{ title: "Laptop", path: "/laptop" },
		pc:			{ title: "Máy tính để bàn", path: "/may-tinh-de-ban-va-phu-kien" },
		audio:		{ title: "Âm thanh", path: "/am-thanh" },
		secCam:		{ title: "Camera giám sát", path: "/camera-giam-sat-2" },
		picCam:		{ title: "Máy ảnh", path: "/may-anh-may-quay-phim" },
		movCam:		{ title: "Máy quay phim", path: "/may-quay-phim" },
		monitor:	{ title: "Máy quay phim", path: "/man-hinh-vi-tinh" },
		printer:	{ title: "Máy in", path: "/man-hinh-may-in" },
		sWatch:		{ title: "Đồng hồ thông minh", path: "/dong-ho-thong-minh" },
		console:	{ title: "Máy chơi game", path: "/dieu-khien-choi-game" },
		
		phoneAcc:	{ title: "Phụ kiện di động", path: "/phu-kien-dien-thoai-may-tinh-bang" },
		smartAcc:	{ title: "Thiết bị thông minh", path: "/thiet-bi-thong-minh" },
		digital:	{ title: "Thiết bị số", path: "/thiet-bi-so" },
		camAcc:		{ title: "Phụ kiện máy ảnh", path: "/phu-kien-may-anh-may-quay-phim" },
		flyCamAcc:	{ title: "Phụ kiện fly cam", path: "phu-kien-may-bay-camera" },
		storage:	{ title: "Thiết bị lưu trữ", path: "/thiet-bi-luu-tru-2" },
		pcAcc:		{ title: "Phụ kiện máy tính", path: "/phu-kien-may-vi-tinh" },
		pcComps:	{ title: "Linh kiện máy tính", path: "/linh-kien-may-tinh" },
		netDevice:	{ title: "Thiết bị mạng", path: "/thiet-bi-mang" },
		consoleAcc:	{ title: "Phụ kiện máy chơi game", path: "/phu-kien-may-choi-game" },

		milk:		{ title: "Sữa công thức - Bột ăn dặm", path: "/sua-cong-thuc-bot-an-dam" },
	}

	/** shopID */
	var ShID = []
	/** sellerID */
	var SeID = []
	/** promotionID*/
	var PID = []

	onCancel((stop) => {
		if (stop)
			this.subScreen.hide();

		halt = true;
		clearInterval(infoUpdateInterval);
		clearInterval(timeUpdateInterval);
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`|   Lazada Promotion List   |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 11:28:49 24/03/2020  |`);
		log(`|===========================|`);

		const scanItem = async ({ sortBy = "sale", pageCount = 1, coolDown = 3000, wordList = ["nhận", "quà tặng"] } = {}, updateList = () => {}) => {
			let list = {}
			let sortedList = []
			let lastLength = 0;

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy    = ${sortBy}`);
			log(`   + pageCount = ${pageCount}`);

			runInfo({
				now: 0,
				progress: 0,
				progWarn: false,
				itemStatus: "Đang khởi chạy",
				itemStatusColor: "yellow",
				dataType: "time",
				current: 0,
				target: 0,
				saved: 0,
				checkDetail: `Vui lòng chờ`
			})

			for (let item of selectedPageList) {
				if (halt)
					return;

				let start = time();
				log(`   + Đang tải: ${item.title}`);
				
				for (let page = 1; page <= pageCount; page++) {
					if (halt)
						return;

					runInfo({
						status: "Đang chạy",
						now: page,
						end: pageCount,
						progress: (page / pageCount) * 100,
						progWarn: false,
						itemStatus: item.title,
						itemStatusColor: "yellow",
						dataType: "time",
						current: page,
						target: pageCount,
						saved: (page / pageCount) * 100,
						checkDetail: `Trang ${page}`
					})

					heartbeat({ color: "yellow" });
					let result = await myajax({
						url: HOSTADDRESS + item.path,
						method: "GET",
						query: {
							ajax: true,
							sort: "popularity",
							page: page
						},
						type: "json"
					});

					if (result.ret) {
						heartbeat({ color: "red", beat: false });
						log(`⚠ REQUEST ERRORED <a href="${result.data.url}" target="_blank">[DETAIL]</a>`);
						for (let i of result.ret)
							log(` + ${i}`);

						log("⚠ TẠM DỪNG 60 GIÂY!");
						await delayAsync(60000);
						page--;
						continue;
					}
		
					for (let [index, item] of result.mods.listItems.entries()) {
						if (halt)
							return;

						runInfo({
							now: index + 1,
							end: result.mods.listItems.length,
							progress: (((page - 1) / pageCount) + (1 / pageCount) * ((index + 1) / result.mods.listItems.length)) * 100,
							progWarn: false,
							itemStatus: item.title,
							itemStatusColor: "green",
							dataType: "time",
							checkDetail: `Trang ${page} | Item ${index + 1}`
						})

						heartbeat();
						let sellerID = parseInt(item.sellerId);
						log(`     + I:${item.itemId}`);
						log(`       + SeID: ${sellerID}`);

						let itemHTML = await myajax({
							url: `https:${item.productUrl}`,
							method: "GET",
							type: "text"
						})

						heartbeat();
						let itemJSON = /app\.run\(({.+})\)/gm.exec(itemHTML);
						let itemData = JSON.parse(itemJSON[1]).data.root.fields;

						if (!itemData.shopPromotion)
							log(`       🔍 No Shop Promotion Data`);
						else {
							clog("DEBG", itemData);

							heartbeat();
							let shopID = itemData.seller.shopId;
							let promotionData = itemData.shopPromotion[itemData.primaryKey.skuId].data;
							let promotionID = promotionData.promotionId
							log(`       + SoID: ${shopID}`);
							log(`       + PID : ${promotionID}`);
							log(`       📃 ${promotionData.title}`);

							if (!wordList.some(w => promotionData.title.toLowerCase().includes(w)))
								log(`       🔍 Not In Word List`);
							else {
								let itemNth = 0;
								let totalItem = 20;
								let page = 1;

								while (true) {
									if (halt)
										return;

									heartbeat({ color: "blue" });
									log(`       + Trang ${page}`);
									let payloadData = JSON.stringify({
										subProductCode: "shopPromotionAll",
										sellerId: sellerID,
										pageIndex: page,
										sortFilter: "101",
										promoGroupId: "1",
										shopId: shopID,
										promotionId: promotionID,
										cr: "1,2,6,2"
									})
	
									let time = (new Date()).getTime();
									let token = (await this.getCookie("https://lazada.vn", "_m_h5_tk")).value.split("_")[0];
									log(` 🔑: ${token}`);
									let MD5Sign = CryptoJS.MD5([token, time, 24677475, payloadData].join("&"));
									log(` 🔏: ${MD5Sign}`);
	
									// Fetch item list
									let MBData = await myajax({
										url: "https://acs-m.lazada.vn/h5/mtop.lazada.detail.multibuyitems/1.0/",
										method: "GET",
										query: {
											jsv: "2.5.1",
											appKey: 24677475,
											t: time,
											sign: MD5Sign,
											api: "mtop.lazada.detail.multiBuyItems",
											v: "1.0",
											type: "originaljson",
											isSec: 1,
											AntiCreep: true,
											timeout: 20000,
											dataType: "json",
											sessionOption: "AutoLoginOnly",
											"x-i18n-language": "vi",
											"x-i18n-regionID": "VN",
											data: payloadData
										}
									})

									clog("DEBG", MBData);
									heartbeat({ color: "blue" });

									if (!MBData.data.products)
										break;

									totalItem = MBData.data.totalSize;
									itemNth += MBData.data.products.length;

									if (itemNth > totalItem)
										break;

									for (let item of MBData.data.products) {
										if (list[item.itemId])
											continue;

										let link = "https:" + item.link;
										let thumbnail = item.image;
					
										list[item.itemId] = {
											id: item.itemId,
											nid: item.skuId,
											title: item.title,
											link: link,
											price: item.price.priceNumber,
											thumbnail,
											promotion: promotionData.title,
											time: time / 1000
										}
					
										sortedList.push(list[item.itemId]);
									}

									if (sortedList.length !== lastLength) {
										log(`         + UPDATING`);

										switch (sortBy) {
											case "name":
												sortedList.sort((a, b) => (a.title < b.title) ? 1 : (a.title > b.title) ? -1 : 0);
												break;

											case "scanTime":
												sortedList.sort((a, b) => (a.time < b.time) ? 1 : (a.time > b.time) ? -1 : 0);
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
	
										updateList({ list, sortedList });
										lastLength = sortedList.length;
									}

									page++;
									await delayAsync(500);
								}
							}
						}

						// Cooldown
						log(`     + Cool Down: ${coolDown}ms`);
						await delayAsync(coolDown);
					}
				}
				
				log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);
			}
		}

		const createItemBox = (itemData) => {
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
			
			priceInfo.append(currentPrice);

			let dealInfo = document.createElement("span");
			dealInfo.classList.add("dealInfo");

			let dealOpen = document.createElement("t");
			dealOpen.classList.add("open");
			dealOpen.innerText = itemData.promotion;

			dealInfo.append(dealOpen);
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

		this.subScreen.show(container, "dealHunt");

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

		var settings = await setup({
			sortBy: {
				type: "radio",
				label: "Sắp xếp theo",
				required: false,
				list: [
					{ name: `Tên`, color: "blue", value: "name" },
					{ name: `Mới quét được`, color: "pink", value: "scanTime", checked: true },
					{ name: `Thời gian mở bán`, color: "blue", value: "openTime" },
					{ name: `Giá item (nhỏ đến lớn)`, color: "blue", value: "priceUp" },
					{ name: `Giá item (lớn đến nhỏ)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số trang quét", value: 1 },
			coolDown: { type: "number", label: "Cooldown", value: 8000 },
			wordList: { type: "textarea", label: "Word List", value: "nhận;quà tặng" }
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

		var CURRENT_PAGE = 1;
		var itemList = [];

		const changeAllListPage = async (page, {
			showCount = 30
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
				allListItem.appendChild(createItemBox(itemList.sortedList[i]));
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
		

		// Start Scanning Item
		await scanItem({
			sortBy: settings.sortBy,
			pageCount: settings.scanPage,
			coolDown: settings.coolDown,
			wordList: settings.wordList.split(";")
		}, data => {
			itemList = data;
			sounds.notification();
			changeAllListPage(CURRENT_PAGE);
		})

		runInfo({ checkDetail: "Đã Chạy Xong", dataType: "time" })
		await complete();
	} catch(e) {
		triggerError(e);
		return;
	}
})()