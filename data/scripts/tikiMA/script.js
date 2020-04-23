// Script begin here
(async () => {
	var infoUpdateInterval = null;
	var doCheck = true;

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
		log(`|  LU: 13:59:57 23/04/2020  |`);
		log(`|===========================|`);
	
		// Get itemName
		var itemName = "";
	
		try {
			itemName = (await command("queryText", { query: "#product-name > span:nth-child(3)" })).text
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
			return;
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
		const getToken = async () => {
			let at = await this.getCookie("https://tiki.vn", "TIKI_ACCESS_TOKEN");
	
			if (!at || !at.value)
				return (await this.getCookie("https://tiki.vn", "TIKI_GUEST_TOKEN")).value
	
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
					}, { confirm: "Tiếp", saveKey: "productSelect" });
	
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

				if (itemData.current_seller) {
					_pid = parseInt(itemData.current_seller.product_id);
					clog("DEBG", "Have current_seller:", itemData.current_seller);
				} else {
					clog("DEBG", "No current_seller. Fetching page to get PID");

					if (updateItemData) {
						clog("DEBG", "Disabling fetchItemData");
						updateItemData = false;
					}

					heartbeat({ color: "red" });
					let itemPage = await myajax({
						url: `${HOSTADDRESS}/${itemData.url_path}`,
						method: "GET",
						type: "text"
					})

					let itemDOM = (new DOMParser()).parseFromString(itemPage, "text/html");
					_pid = parseInt(itemDOM.getElementById("product_id_add_cart").value);
				}

				if (_pid !== PID) {
					log(`PID Change: ${PID} -> ${_pid} (2)`);
					PID = _pid;
				}
			}

			if (!PID)
				throw { code: -1, description: "Không xác định được PID của sản phẩm" }

			let data = await myajax({
				url: `${HOSTADDRESS}/ajaxProductRender`,
				method: "GET",
				query: {
					pid: ID,
					spid: PID
				}
			})

			if (!data || data.id !== PID || !data.current_seller.id) {
				clog("DEBG", "No Item Data. Returning INIT Data");
				itemStatus = (!data) ? "NO_DATA" : (data.id !== PID ? "ID_MISMATCH" : (!data.current_seller.id ? "NO_SELLER" : "UNKNOWN"));
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
		try {
			ID = parseInt((await command("queryInput", { query: "input#product_id" })).value)
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}
		
		await fetchItemData();
		await updatePriceHistory(3, ID, PID);
		log("Đã lấy thông tin Item");

		let randomTikiPage = await myajax({
			url: `${HOSTADDRESS}/deal-hot`,
			method: "GET",
			type: "text"
		})

		let randomTikiDoc = (new DOMParser()).parseFromString(randomTikiPage, "text/html");
		const TIKI_CSRF_TOKEN = randomTikiDoc.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
		log(`🗝 CSRF: ${TIKI_CSRF_TOKEN}`);
	
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
			randomIp: { type: "checkbox", label: "Áp dụng IP ngẫu nhiên", color: "blue", value: false },
			ip: { type: "text", label: "Địa chỉ IP (tùy chọn)", depend: "randomIp", doubt: true },
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
			continueRun: { type: "checkbox", label: "Tiếp tục chạy khi chưa mua đủ số lượng", color: "pink", depend: "autoReOrder" }
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
						thumbnail: data.thumbnail
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
				await errored("Lỗi khi đăng nhập vào tài khoản");
				log(`📥 Không thể đăng nhập vào tài khoản \"${username}\"`);
				log(` + MSG : ${loginResponse.messages.email || "Không Rõ"}`);
				throw { code: -1, description: loginResponse.messages.email, data: loginResponse }
			}

			if (loginResponse.messages && loginResponse.messages.password) {
				await errored("Lỗi khi đăng nhập vào tài khoản");
				log(`📥 Không thể đăng nhập vào \"${username}\"`);
				log(` + MSG : ${loginResponse.messages.password || "Không Rõ"}`);
				throw { code: -1, description: loginResponse.messages.password, data: loginResponse }
			}

			log(`📥 Đăng nhập thành công (${loginTimer.stop}s)`);
		}

		const __clearCart = async () => {
			heartbeat();
			log(`🛒 Đang lấy danh sách giỏ hàng`);
			runInfo({ now: `Bước 1`, end: `Bước 6`, progress: 0, checkDetail: "Đang lấy danh sách" });

			let placeOrderHTML = await myajax({
				url: `${HOSTADDRESS}/checkout/cart`,
				method: "GET",
				type: "text"
			});

			let placeOrderDOM = (new DOMParser()).parseFromString(placeOrderHTML, "text/html");
			let deleteNodeList = placeOrderDOM.querySelectorAll("#shopping-cart > div.shopping-cart-item > div.col-right > div.box-info-product > p.action > a.btn.btn-link.btn-item-delete");

			heartbeat();
			log(`🛒 ${deleteNodeList.length} item hiện trong giỏ hàng`);

			let CSRF_CART = placeOrderDOM.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
			log(`CSRF: ${CSRF_CART}`);

			for (let item of deleteNodeList) {
				let id = item.dataset.itemId;
				log(`🛒 Đang xóa đơn hàng ID ${id}`);

				try {
					await myajax({
						url: `${HOSTADDRESS}/checkout/cart/ajax_delete`,
						method: "POST",
						header: {
							"X-Access-Token": await getToken(),
							apikey: null
						},
						form: {
							id,
							TIKI_CSRF_TOKEN: CSRF_CART
						}
					})
				} catch(e) {
					log("🛒 Không thể xóa Item khỏi Giỏ");
					log(` + ID  : ${id}`);
					log(` + Code: ${e.code}`);
					log(` + MSG : ${e.description || "Không rõ"}`);
					log(` + Bỏ qua lỗi: true`);

					clog("ERRR", `Remove Cart ${id}`, e);
					continue;
				}

				heartbeat({ color: "blue" });
				log(`🛒 Xóa thành công`);
			}
		}
		
		const __doOrder = async ({
			id = 0,
			count = 0,
			coupon = "",
			paymentMethod = "cod",
			shippingAddress = null
		}) => {
			sounds.notification();
			let orderTimer = new stopClock();

			log("Đang thêm Item vào Giỏ Hàng");
			runInfo({ now: `Bước 3`, progress: 20, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			let addData = {}

			try {
				addData = await myajax({
					url: `${HOSTADDRESS}/checkout/cart/ajaxAdd`,
					method: "POST",
					form: {
						id: id,
						qty: count
					}
				});
			} catch(e) { throw e }
	
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
				await myajax({
					url: `${HOSTADDRESS}/checkout/cart/ajaxCoupon`,
					method: "POST",
					form: {
						coupon_code: coupon
					}
				})

				log(` + Áp dụng Coupon thành công!`);
			}
			
			heartbeat();
			runInfo({ now: `Bước 4`, progress: 40, checkDetail: "Đang chọn địa chỉ Giao Hàng" });
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
					log("🏡 Không thể lấy sổ địa chỉ");
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

			await myajax({
				url: `${HOSTADDRESS}/checkout/shipping/ajaxSave`,
				method: "POST",
				form: {
					address_id: shippingID,
					TIKI_CSRF_TOKEN: TIKI_CSRF_TOKEN
				}
			})

			runInfo({ now: `Bước 5`, progress: 60, progWarn: false, checkDetail: "Đang lấy thông tin thanh toán" });
			log(`Đang lấy thông tin Thanh Toán`);
			heartbeat();

			log(` + Đang nhận thông tin`);
			let paymentRAW = await myajax({
				url: `${HOSTADDRESS}/checkout/payment`,
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

			log(` + Phương thức thanh toán: ${paymentMethod.toUpperCase()}`);
			paymentData.selected_payment_method = paymentMethod;

			if (paymentDoc.getElementById("plan-3")) {
				log(` + Phát hiện Tiki Now!`);
				log(`   + Đang cập nhật thông tin giỏ`);

				await myajax({
					url: `${HOSTADDRESS}/checkout/payment/ajax_update_cart`,
					method: "POST",
					header: {
						"X-Access-Token": await getToken(),
						apikey: null
					},
					form: {
						selected_payment_method: paymentData.selected_payment_method,
						shipping_plan_id: 3,
						is_tikinow_free_trial: 0,
						is_using_reward_point: 0,
						TIKI_CSRF_TOKEN: CSRF_PAYMENT
					}
				});

				paymentData.shipping_plan = parseInt(paymentDoc.getElementById("plan-3").value);
				paymentData.transaction_type = "sale,create_payment_token";
				delete paymentData.payment_method_tikixu;
				delete paymentData.card_number;
				delete paymentData["input-card-type"];
				delete paymentData.card_expiry_date;
				delete paymentData.card_cvn;
				delete paymentData.card_type;

				paymentData["atm-id"] = "";
				paymentData.signature = "";
				paymentData.gift_message = "";
				paymentData.tax_company_address = "";
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
			let placeOrder = await myajax({
				url: `${HOSTADDRESS}/checkout/payment/ajax_check_place_order`,
				method: "POST",
				header: {
					"X-Access-Token": await getToken(),
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

			if (paymentMethod === "momo") {
				log(` + Order Code    : ${placeOrder.order_code}`);
				log(` + TransactionID : ${placeOrder.payment.transactionId}`);
				log(` + payURL        : <a href="${placeOrder.payment.payUrl}" target="_blank">LINK</a>`);
				log(` + QR Code       : <a href="${placeOrder.payment.qrCode}" target="_blank">LINK</a>`);
				log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.payment.qrCode}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
			}

			log(` + Thời gian   : ${orderTimer.stop}s`);
		}
	
		__checkHandler();
		log("Bắt đầu kiểm tra giá");
	} catch(e) {
		triggerError(e);
		return;
	}
})()