// Script begin here
(async () => {
	var infoUpdateInterval = null;
	var doCheck = true;
	var beaconNote = []

	const HOSTADDRESS = "https://tiki.vn";

	onCancel(() => {
		clearInterval(infoUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`|   Tiki Multiple Account   |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 17:37:23 29/05/2020  |`);
		log(`|===========================|`);
	
		// Get itemName
		var itemName = "";
	
		try {
			itemName = (await command("queryText", { query: `div.header > h1.title` })).text
		} catch(e) {
			try {
				itemName = (await command("queryText", { query: `#product-name > span:nth-child(3)` })).text
			} catch(e) {
				rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
				return;
			}
		}
	
		log("itemName: " + itemName);
		info({ title: itemName });
		var itemInitPrice = null;
		var updateItemData = true;
		var itemData = {}
	
		// Get ID
		var ID = null;
		var PID = null;
		var CFID = null;

		// Define
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

		const fetchItemData = async (updateInfo = true) => {
			if (updateItemData) {
				itemData = await myajax({
					url: `${HOSTADDRESS}/api/v2/products/${ID}`,
					method: "GET",
					changeState: false
				});
	
				if (ID !== itemData.id) {
					log(`ID Change: ${ID} -> ${itemData.id}`);
					ID = itemData.id;
				}
			}

			let itemPrice = itemData.price;
			let itemOldPrice = itemData.list_price;
			let itemStatus = itemData.inventory_status;
			let itemQTY = (itemData.stock_item) ? itemData.stock_item.qty : "?";
			let minSale = (itemData.stock_item) ? itemData.stock_item.min_sale_qty : "?";
			let maxSale = (itemData.stock_item) ? itemData.stock_item.max_sale_qty : "?";

			if (updateInfo)
				info({
					id: ID,
					price: priceFormat(itemData.price),
					tags: [
						`status: ${itemData.inventory_status}`,
						`Deal: ${itemData.is_deal ? "Có" : "Không"}`,
						`Số lượng: ${itemQTY}`,
						`MIN Sale: ${minSale}`,
						`MAX Sale: ${maxSale}`,
						`freeShip: ${itemData.is_free_shipping ? "Có" : "Không"}`,
						itemData.warranty_lifetime || "Không Bảo Hành"
					]
				})

			if (itemData.configurable_products) {
				if (!CFID) {
					let configList = []

					for (let item of itemData.configurable_products)
						configList.push({
							name: item.name,
							color: "pink",
							value: item.child_id
						});
	
					let select = await setup({
						customPID: { type: "number", label: "PID tùy chỉnh", save: false },
						config: {
							type: "radio",
							label: "Chọn loại hàng",
							list: configList
						}
					}, { confirm: "Tiếp" });
	
					if (select.customPID) {
						clog("DEBG", `Custom PID: ${select.customPID}`);
						CFID = "custom";
						PID = select.customPID;
					} else {
						if (!select.config)
							throw { code: -1, description: "Vui lòng chọn loại hàng!" }

						CFID = parseInt(select.config);
					}

					log(`Config ID: ${CFID}`);
					await delayAsync(400);
				}

				if (CFID !== "custom")
					for (let item of itemData.configurable_products)
						if (item.child_id === CFID) {
							itemPrice = item.price;
							itemStatus = item.inventory_status;

							if (item.id !== PID) {
								log(`PID Change: ${PID} -> ${item.id} (1)`);
								PID = parseInt(item.id);
							}

							break;
						}
			} else {
				let _pid = PID;

				if (itemData.current_seller)
					_pid = parseInt(itemData.current_seller.product_id);

				if (_pid !== PID) {
					log(`PID Change: ${PID} -> ${_pid} (2)`);
					PID = _pid;
				}
			}

			if (!PID) {
				clog("DEBG", "No PID. Returning INIT Data");
				itemStatus = "NO_PID";
				itemQTY = "?";
				minSale = "?";
				maxSale = "?";
			} else {
				let data = await myajax({
					url: `${HOSTADDRESS}/api/v2/products/${ID}`,
					method: "GET",
					header: {
						"X-Access-Token": await getToken()
					},
					query: {
						spid: PID,
						include: [
							"tag",
							"badges",
							"stock_item",
							"variants",
							"discount_tag"
						].join(",")
					}
				})

				if (data.error) {
					await errored("Lỗi khi lấy thông tin Sản Phẩm");
					log("⚠ Tiki trả về mã lỗi");
					log(` + Code : ${data.error.code}`);
					log(` + MSG  : ${data.error.message}`);
					throw { code: data.error.code, description: data.error.message, data: data.error }
				}
	
				let _id = data.current_seller.id || null;
				let _pid = parseInt(data.current_seller.product_id);
	
				if (!data || _pid !== PID || !_id) {
					clog("DEBG", "No Item Data. Returning INIT Data");
					itemStatus =
						(!data)
							? "NO_DATA"
							: (_pid !== PID
								? "ID_MISMATCH"
								: (!_id
									? "NO_SELLER"
									: "UNKNOWN")
							)
	
					itemQTY = "?";
					minSale = "?";
					maxSale = "?";
				} else {
					itemPrice = data.price;
					itemStatus = data.inventory_status;
					itemQTY = (data.stock_item) ? data.stock_item.qty : "?";
					minSale = (data.stock_item) ? data.stock_item.min_sale_qty : "?";
					maxSale = (data.stock_item) ? data.stock_item.max_sale_qty : "?";
				}
			}

			if (!itemInitPrice)
				itemInitPrice = itemPrice;

			if (updateInfo)
				info({
					id: ID,
					price: priceFormat(itemPrice),
					tags: [
						`status: ${itemStatus}`,
						`Deal: ${itemData.is_deal ? "Có" : "Không"}`,
						`Số lượng: ${itemQTY}`,
						`MIN Sale: ${minSale}`,
						`MAX Sale: ${minSale}`,
						`freeShip: ${itemData.is_free_shipping ? "Có" : "Không"}`,
						itemData.warranty_lifetime || "Không Bảo Hành",
						`CFID: ${CFID || "?"}`,
						`PID: ${PID}`
					]
				})

			return {
				price: parseInt(itemPrice),
				oldPrice: parseInt(itemOldPrice),
				thumbnail: itemData.thumbnail_url,
				status: itemStatus,
				qty: parseInt(itemQTY)
			}
		}
		
		//? PRICE HISTORY CONTAINER
		var PHC = document.createElement("div");
		PHC.classList.add("priceHistory");
		//? PH Title
		var PHTitle = document.createElement("t");
		PHTitle.classList.add("title");
		PHTitle.innerText = "Thông Tin Giá";
		//? PH Chart
		var PHChart = document.createElement("div");
		PHChart.classList.add("chart");
		const PHChartBarMin = 30;
		const PHChartBarMax = 100;
		//? PH Info
		var PHInfo = document.createElement("div");
		PHInfo.classList.add("info");
		PHC.append(PHTitle, PHChart, PHInfo);

		const updatePriceHistory = async (type, ID1, ID2) => {
			log("Đang lấy thông tin giá Item");
			let beeCost = await myajax({
				url: `https://apiv2.beecost.com/ecom/product/history`,
				method: "GET",
				query: {
					product_base_id: [type, ID1, ID2].filter(Number).join("__"),
					price_current: itemInitPrice
				}
			})

			let costData = { max: 0, min: 0, avg: 0 }
			let costHistory = []
			let costHistoryTime = []
			let costHistoryTimeDelta = 0;

			if (beeCost.status === "error" || !beeCost.data) {
				log(" + Lỗi đã xảy ra khi lấy thông tin giá Item");
				log(`    + MSG : ${beeCost.meta.message || "Không Rõ"}`);
				log(`    + Bỏ qua lỗi: true`);

				PHC.classList.add("noData");
			} else {
				costHistory = beeCost.data.item_history.price;
				costHistoryTime = beeCost.data.item_history.price_ts;
				costHistoryTimeDelta = (costHistoryTime[costHistoryTime.length - 1] - costHistoryTime[0]) / 2592000000;

				costData = {
					min: Math.min( ...costHistory ),
					max: Math.max( ...costHistory ),
					avg: costHistory.reduce((a, b) => a + b) / costHistory.length
				}

				PHC.classList.remove("noData");
			}

			emptyNode(PHChart);

			//? PH deltaTime
			var PHChartDeltaTime = document.createElement("span");
			PHChartDeltaTime.classList.add("deltaTime");
			PHChartDeltaTime.innerHTML = `<b>Δ:</b> ${costHistoryTimeDelta.toFixed(1)} tháng`;
			PHChart.appendChild(PHChartDeltaTime);

			for (let i = 0; i < costHistory.length; i++) {
				let value = costHistory[i];
				let timeStamp = new Date(costHistoryTime[i]);

				let bar = document.createElement("span");
				let _p = ((value - costData.min) / (costData.max - costData.min));
				bar.classList.add("bar", (value === costData.max)
					? "max"
					: (value === costData.min)
						? "min"
						:(value === itemInitPrice)
							? "cur"
							: "avg"
				)

				bar.dataset.value = value;
				bar.title = `${priceFormat(value)}đ\n${timeStamp.toLocaleString()}`;
				bar.style.height = `${((PHChartBarMin + _p * (PHChartBarMax - PHChartBarMin)) / (100 + 0)) * 100}%`;

				PHChart.appendChild(bar);
			}

			//? PH Line
			var PHChartAvgLine = document.createElement("span");
			PHChartAvgLine.classList.add("avgLine");
			PHChartAvgLine.style.bottom = `${((PHChartBarMin + ((costData.max - costData.avg) / (costData.max - costData.min)) * (PHChartBarMax - PHChartBarMin)) / (100 + 0)) * 100}%`;
			PHChart.appendChild(PHChartAvgLine);

			PHInfo.innerHTML = `
				<span class="col max">
					<t>Cao Nhất</t>
					<span class="price">${priceFormat(costData.max)}</span>
				</span>
				<span class="col avg">
					<t>Trung Bình</t>
					<span class="price">${priceFormat(costData.avg)}</span>
				</span>
				<span class="col min">
					<t>Thấp Nhất</t>
					<span class="price">${priceFormat(costData.min)}</span>
				</span>
			`

			log(" + Lấy thông tin thành công (beeCost)");
		}
	
		//? GET ITEM ID
		let urlRe = /(?:http|https):\/\/tiki\.vn\/.*\-p(\d+)\.html.*/gm.exec(this.page.url.href)

		if (!urlRe[1]) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}

		ID = parseInt(urlRe[1]);
		
		await fetchItemData();
		await updatePriceHistory(3, ID, PID);
		log("Đã lấy thông tin Item");
	
		log("Đang chờ cài đặt từ người dùng");
		let prevAccountList = (await this.dataLoad("tikiMA.accountList"))["tikiMA.accountList"] || "";

		// Wait for Account List
		const account = await setup({
			note: { type: "note", level: "info", text: "Mỗi tài khoản một dòng, ngăn cách tên tài khoản và mật khẩu bằng <b>:</b> (ex: \"username:password\")" },
			list: { type: "textarea", label: "Danh sách tài khoản", height: "180px", value: prevAccountList, required: true, save: false }
		}, { confirm: "Tiếp", saveKey: "accountSetup" });

		log("👥 Đang lưu danh sách tài khoản");
		await this.dataSave({ "tikiMA.accountList": account.list });
		var accountList = account.list
			.split("\n")
			.filter(String)
			.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null } });

		await delayAsync(600);

		// Wait for settings
		const settings = await setup({
			priceHistory: { type: "customNode", node: PHC },
			orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, save: false, required: true },
			orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
			checkInterval: { type: "number", label: "Khoảng kiểm tra", value: 1000, required: true },
			coupon: { type: "text", label: "Mã giảm giá (tùy chọn)" },
			paymentMethod: {
				type: "radio",
				label: "Phương Thức Thanh Toán",
				required: true,
				list: [
					{ name: `Thanh Toán Khi Nhận Hàng`, color: "pink", value: "cod", checked: true },
					{ name: `Ví Momo`, color: "blue", value: "momo" }
				]
			},
			autoReOrder: { type: "checkbox", label: "Tự động mua lại cho tài khoản", color: "blue", value: false, save: false },
			autoReOrderTimes: { type: "number", label: "Số lần tự động mua lại CHO MỐI TÀI KHOẢN", value: 2, depend: "autoReOrder" },
			continueRun: { type: "checkbox", label: "Tiếp tục chạy khi chưa mua đủ số lượng", color: "pink", depend: "autoReOrder" },
			xPlatform: { type: "text", label: "X-Platform", value: "frontend-desktop" }
		});
	
		log("CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		accountList = accountList.map(i => { i.c = (settings.autoReOrder) ? settings.autoReOrderTimes : 1; return i });
		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		var checkNth = 0;
		var start = time();
		var successCount = 0;
	
		runInfo({
			end: settings.checkInterval + "ms",
			target: settings.orderPrice
		});
	
		const checker = async () => {
			checkNth++;
	
			let reqStart = time();
			let data = {}
			try {
				data = await fetchItemData(false);
			} catch(e) {
				heartbeat({ color: "red" });
				log(" + Lỗi đã xảy ra khi lấy thông tin Item");
				log(`    + Code: ${e.code}`);
				log(`    + MSG : ${e.description || "Không Rõ"}`);
				log(`    + Bỏ qua lỗi: true`);

				let reqTime = ((time() - reqStart) * 1000);
				let reqTimeAT = (reqTime / settings.checkInterval) * 100;
				runInfo({
					progress: reqTimeAT,
					now: reqTime.toFixed(2) + "ms",
					itemStatus: "LỖI ĐÃ XẢY RA",
					itemStatusColor: "red",
					checkDetail: "Một lỗi đã xảy ra trong quá trình kiểm tra giá Item"
				});

				return;
			}
	
			var currentPrice = data ? data.price : null;
			let reqTime = ((time() - reqStart) * 1000);
			let reqTimeAT = (reqTime / settings.checkInterval) * 100;
			let orderedCount = 0;
	
			runInfo({
				progress: reqTimeAT,
				now: reqTime.toFixed(2) + "ms",
				current: currentPrice ? currentPrice : "Không Rõ",
				saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
				itemStatus: (data.status === "available") ? `CÓ HÀNG (${data.qty})` : `KHÔNG CÒN HÀNG (${data.qty}) [${data.status}]`,
				itemStatusColor: (data.status === "available") ? "green" : "red",
				checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
			})

			heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

			if (typeof currentPrice === "number" && currentPrice < settings.orderPrice && data.status === "available") {
				log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
				doCheck = false;
				order();

				for (var orderNth = 0; orderNth < accountList.length; orderNth++) {
					let account = accountList[orderNth];

					if (account.c <= 0) {
						log(`🏳 Đã mua đủ số lượng cho tài khoản ${account.u}`);
						continue;
					}

					runInfo({ itemStatus: `Lần Mua ${orderNth + 1}/${accountList.length}`, itemStatusColor: "yellow" });
					heartbeat();
					log(`👤 ACCOUNT ${account.u} (${orderNth + 1}/${accountList.length})`);
					log(`🔃 Số lần mua: ${account.c}`);

					try {
						await __switchAccount({
							username: account.u,
							password: account.p
						});

						for (let time = 1; time <= account.c; time++) {
							log(`---------- LẦN ${time}/${account.c} ----------`);
							sounds.notification();
							await __doOrder({
								id: PID,
								count: settings.orderCount,
								paymentMethod: settings.paymentMethod,
								shippingAddress: account.a
							});

							successCount++;
							orderedCount++;
							accountList[orderNth].c--;
						}
					} catch(e) {
						heartbeat({ color: "red" });
						log(`👤 Mua thất bại cho ${account.u}! (${orderNth + 1}Nth)`);
						clog("ERRR", `doOrder ${account.u} [${PID}]`, e);
						await __clearCart();
						continue;
					}

					heartbeat();
					log(`👤 Mua thành công cho ${account.u}! (${orderNth + 1}Nth)`);
				}

				if (orderedCount > 0)
					await sendBeacon({
						script: SCRIPT.id,
						name: itemName,
						link: `${HOSTADDRESS}/item-p${ID}.html`,
						price: currentPrice,
						count: orderedCount,
						runPrice: itemInitPrice,
						oldPrice: data.oldPrice,
						thumbnail: data.thumbnail,
						note: [
							`ID        : ${ID}`,
							`CFID      : ${CFID}`,
							`PID       : ${PID}`,
							...beaconNote
						].join("\n")
					});

				if (successCount < (settings.autoReOrderTimes * accountList.length) && settings.continueRun) {
					log("🛒 Chưa mua đủ số lượng. TIẾP TỤC CHẠY");
					log(` + ĐÃ MUA ${successCount}/${settings.autoReOrderTimes * accountList.length}. Còn ${(settings.autoReOrderTimes * accountList.length) - successCount}`);
					doCheck = true;
					return;
				}
	
				complete();
				runInfo({
					itemStatus: `ĐÃ ĐẶT ${successCount} items`,
					itemStatusColor: (successCount === settings.autoReOrderTimes ? "green" : "yellow"),
					progress: 100,
					progWarn: false,
					checkDetail: "Đặt hàng thành công"
				});

				log("CHẠY KẾT THÚC");
				return;
			}
		}
	
		const __checkHandler = async () => {
			if (!doCheck)
				return;
	
			let timeStart = time();
			await checker();
			setTimeout(() => __checkHandler(), settings.checkInterval - ((time() - timeStart) * 1000));
		}
	
		infoUpdateInterval = setInterval(() => {
			let runTime = time() - start;
			runInfo({ time: runTime });
		}, 60)


		//! |===============================|
		//! |       ORDER MAIN LOGIC        |
		//! |===============================|

		const __switchAccount = async ({
			username = "",
			password = ""
		}) => {
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
			} finally {}

			log("📤 Đăng xuất thành công");

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
				log(` + MSG : Invalid Tokens`);

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
				log(` + Xóa thành công`);
			}
		}
	
		__checkHandler();
		log("Bắt đầu kiểm tra giá");
	} catch(e) {
		triggerError(e);
		return;
	}
})()