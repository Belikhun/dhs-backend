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
		log(`|       Tiki Auto v013      |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 15:45:52 10/04/2020  |`);
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
	
		// Get ID
		var ID = null;
		var PID = null;
		var CFID = null;

		// Define
		const getToken = async () => (await this.getCookie(HOSTADDRESS, "TIKI_ACCESS_TOKEN")).value

		const fetchItemData = async (updateInfo = true) => {
			let data = await myajax({
				url: `${HOSTADDRESS}/api/v2/products/${ID}`,
				method: "GET",
				changeState: false
			});
	
			ID = data.id;
			let itemPrice = null;
			let itemStatus = null;
			let itemQTY = null;

			if (updateInfo)
				info({
					id: ID,
					price: priceFormat(data.price),
					tags: [
						`status: ${data.inventory_status}`,
						`Deal: ${data.is_deal ? "Có" : "Không"}`,
						`Số lượng: ${(data.stock_item) ? data.stock_item.qty : "?"}`,
						`freeShip: ${data.is_free_shipping ? "Có" : "Không"}`,
						data.warranty_lifetime || "Không Bảo Hành"
					]
				})

			if (!CFID && data.configurable_products) {
				let configList = []

				for (let item of data.configurable_products)
					configList.push({
							name: item.name,
							color: "pink",
							value: item.child_id
						});

				let select = await setup({
					config: {
						type: "radio",
						label: "Chọn loại hàng",
						required: true,
						list: configList
					}
				}, { confirm: "Tiếp" });

				CFID = parseInt(select.config);
				log(`Config ID: ${CFID}`);

				await delayAsync(400);

				for (let item of data.configurable_products)
					if (item.child_id === CFID) {
						itemPrice = item.price;
						itemStatus = item.inventory_status;

						if (item.id !== PID) {
							log(`PID Change: ${PID} -> ${item.id} (1)`);
							PID = parseInt(item.id);
						}
					}
			} else {
				itemPrice = data.price;
				itemStatus = data.inventory_status;

				if (data.stock_item)
					itemQTY = data.stock_item.qty;

				let _pid = PID;

				if (data.current_seller)
					_pid = parseInt(data.current_seller.product_id);
				else {
					heartbeat({ color: "red" });
					let itemPage = await myajax({
						url: `${HOSTADDRESS}/${data.url_path}`,
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

			if (!itemInitPrice)
				itemInitPrice = itemPrice;

			if (updateInfo)
				info({
					id: ID,
					price: priceFormat(itemPrice),
					tags: [
						`status: ${itemStatus}`,
						`Deal: ${data.is_deal ? "Có" : "Không"}`,
						`Số lượng: ${(data.stock_item) ? data.stock_item.qty : "?"}`,
						`freeShip: ${data.is_free_shipping ? "Có" : "Không"}`,
						data.warranty_lifetime || "Không Bảo Hành",
						`CFID: ${CFID}`,
						`PID: ${PID}`
					]
				})

			return {
				price: itemPrice,
				oldPrice: data.list_price,
				thumbnail: data.thumbnail_url,
				status: itemStatus,
				qty: itemQTY
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
	
		log("Đang chờ cài đặt từ người dùng");
		// Wait for settings
		const settings = await setup({
			priceHistory: { type: "customNode", node: PHC },
			orderByPrice: { type: "switch", label: "Mua theo giá sản phẩm", name: "orderBy", value: true },
			orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, required: true, save: false },
			orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
			reCheckPrice: { type: "number", label: "Kiểm tra lại giá", value: 5, depend: "orderBy:orderByPrice" },
			orderByCoupon: { type: "switch", label: "Mua theo áp mã giảm giá", name: "orderBy" },
			coupon: { type: "text", label: "Mã giảm giá (tùy chọn)" },
			checkInterval: { type: "number", label: "Khoảng kiểm tra", value: 200, required: true },
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
			autoReOrder: { type: "checkbox", label: "Tự động mua lại", color: "pink", depend: "orderBy:orderByPrice" },
			autoReOrderTimes: { type: "number", label: "Số lần tự động mua lại", value: 2, depend: "autoReOrder" },
		});
	
		log("CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		var checkNth = 0;
		var start = time();
	
		switch (settings.orderBy) {

			//! |==========================|
			//! |   Order By Price Check   |
			//! |==========================|
			case "orderByPrice":
				runInfo({
					end: settings.checkInterval + "ms",
					target: settings.orderPrice
				});
			
				var checker = async () => {
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
					
					let currentPrice = data ? data.price : null;
					let reqTime = ((time() - reqStart) * 1000);
					let reqTimeAT = (reqTime / settings.checkInterval) * 100;
					let successCount = 0;
			
					runInfo({
						progress: reqTimeAT,
						now: reqTime.toFixed(2) + "ms",
						current: currentPrice ? currentPrice : "Không Rõ",
						saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
						itemStatus: (data.status === "available") ? `CÓ HÀNG` : `KHÔNG CÒN HÀNG (${data.status})`,
						itemStatusColor: (data.status === "available") ? "green" : "red",
						checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
					})

					heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

					if (typeof currentPrice === "number" && currentPrice < settings.orderPrice && data.status === "available") {
						log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
						doCheck = false;
						order();
			
						if (settings.autoReOrder)
							for (var orderNth = 1; orderNth <= settings.autoReOrderTimes; orderNth++) {
								runInfo({ itemStatus: `Lần Mua ${orderNth}/${settings.autoReOrderTimes}`, itemStatusColor: "yellow" });
								heartbeat();
								log(`========== ITEM ${orderNth}/${settings.autoReOrderTimes} ==========`);

								if (orderNth % settings.reCheckPrice === 0) {
									log("Đang kiểm tra giá hiện tại");
									heartbeat({ color: "yellow" });
									var _cp = {};

									try {
										_cp = await fetchItemData(false);

										runInfo({
											current: _cp.price,
											saved: ((_cp.price - itemInitPrice) / itemInitPrice) * 100,
										});
									} catch(e) {
										log(" + Lỗi đã xảy ra khi lấy thông tin Item");
										log(`    + Code: -1`);
										log(`    + Bỏ qua lỗi: true`);
									} finally {
										if (_cp.price >= settings.orderPrice) {
											await errored(`Giá đã thay đổi`);
											log(" + Giá đã bị thay đổi");
											log(`    + Code: -1`);
											log(`    + NP  : ${priceFormat(_cp.price)}`);
											log(`    + Đang dừng chạy`);
											break;
										}

										log(` + Giá chưa thay đổi. Tiếp tục chạy`);
									}
								}

								try {
									await __doOrder({
										id: PID,
										count: settings.orderCount,
										paymentMethod: settings.paymentMethod
									});

									successCount++;
								} catch(e) {
									continue;
								}

								heartbeat();
								log(`Mua thành công item thứ ${orderNth}!`);
							}
						else {
							await __doOrder({
								id: PID,
								count: settings.orderCount,
								coupon: settings.coupon,
								paymentMethod: settings.paymentMethod
							});

							successCount++;
						}
			
						complete();
						runInfo({
							itemStatus: `ĐÃ ĐẶT ${settings.autoReOrder ? successCount : settings.orderCount} items`,
							itemStatusColor: settings.autoReOrder ? (successCount === settings.autoReOrderTimes ? "green" : "yellow") : "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Đặt hàng thành công"
						});

						await command("changeLocation", { href: `${HOSTADDRESS}/sales/order/history` });

						await sendBeacon({
							script: SCRIPT.id,
							name: itemName,
							link: `${HOSTADDRESS}/item-p${ID}.html`,
							price: currentPrice,
							count: successCount,
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

						log("CHẠY KẾT THÚC");
						return;
					}
				}
			
				var __checkHandler = async () => {
					if (!doCheck)
						return;
			
					let timeStart = time();
					await checker();
					setTimeout(() => __checkHandler(), settings.checkInterval - ((time() - timeStart) * 1000));
				}
			
				infoUpdateInterval = setInterval(() => {
					let runTime = time() - start;
					runInfo({ time: runTime });
				}, 60);
				break;

			//! |==========================|
			//! |   Order By Coupon Check  |
			//! |==========================|
			case "orderByCoupon":
				runInfo({
					end: settings.checkInterval + "ms",
					target: settings.orderPrice
				});
			
				var checker = async () => {
					checkNth++;
			
					let reqStart = time();
					var currentPrice = null;

					try {
						await myajax({
							url: `${HOSTADDRESS}/checkout/cart/ajaxCoupon`,
							method: "POST",
							form: {
								coupon_code: settings.coupon
							}
						})

						let checkoutHTML = await myajax({
							url: `${HOSTADDRESS}/checkout/cart`,
							method: "GET",
							type: "text"
						})

						let checkoutDOM = (new DOMParser()).parseFromString(checkoutHTML, "text/html");
						let priceBox = checkoutDOM.querySelector("#right-affix > div.each-row > div:nth-child(2) > div > div > p:nth-child(1) > strong");

						currentPrice = parseInt(priceBox.innerText.match(/\d/g).join(""));
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
			
					let reqTime = ((time() - reqStart) * 1000);
					let reqTimeAT = (reqTime / settings.checkInterval) * 100;
			
					runInfo({
						progress: reqTimeAT,
						now: reqTime.toFixed(2) + "ms",
						current: currentPrice ? currentPrice : "Không Rõ",
						saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
						itemStatus: settings.coupon,
						itemStatusColor: "gray",
						checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
					})

					heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

					if (typeof currentPrice === "number" && currentPrice < settings.orderPrice) {
						log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
						doCheck = false;
						order();

						await __doOrder({ skipPre: true });

						complete();
						runInfo({
							itemStatus: `ĐÃ ĐẶT ${settings.orderCount} items`,
							itemStatusColor: "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Đặt hàng thành công"
						});

						await command("changeLocation", { href: HOSTADDRESS + "/sales/order/history" });

						beaconNote = [
							`ID   : ${ID}`,
							`CFID : ${CFID}`,
							`PID  : ${PID}`,
							...beaconNote
						]

						await sendBeacon({
							script: SCRIPT.id,
							name: itemName,
							link: `${HOSTADDRESS}/item-p${ID}.html`,
							price: currentPrice,
							count: settings.orderCount,
							runPrice: itemInitPrice,
							note: beaconNote.join("\n")
						});

						log("CHẠY KẾT THÚC");
						return;
					}
				}
			
				var __checkHandler = async () => {
					if (!doCheck)
						return;
			
					let timeStart = time();
					await checker();
					setTimeout(() => __checkHandler(), settings.checkInterval - ((time() - timeStart) * 1000));
				}
			
				infoUpdateInterval = setInterval(() => {
					let runTime = time() - start;
					runInfo({ time: runTime });
				}, 60);
				break;
		}

		//! |==========================|
		//! |       ADD TO CART        |
		//! |==========================|

		const addIntoCart = async ({
			id = 0,
			count = 0,
		} = {}) => {
			log(`Đang thêm Item ${id} C:${count} vào Giỏ Hàng`);
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
			} catch(e) {
				triggerError(e);
				return false;
			}
	
			if (addData.error) {
				await errored("Lỗi khi thêm Item vào Giỏ");
				log(" + Không thể thêm Item vào Giỏ");
				log(`    + Code: -1`);
				log(`    + MSG : ${addData.error.message || "Không rõ"}`);
				throw { code: -1, description: "Không thể thêm Item vào Giỏ: " + addData.error.message, data: addData.error }
			}

			log(" + Thêm vào giỏ thành công!");
		}

		//! |==========================|
		//! |  DO ORDER MAIN FUNCTION  |
		//! |==========================|
		
		const __doOrder = async ({
			id = 0,
			count = 0,
			coupon = "",
			skipPre = false,
			paymentMethod = "cod"
		}) => {
			sounds.notification();
			let orderTimer = new stopClock();
			runInfo({ now: `Bước 0`, end: `Bước 4`, progress: 0, checkDetail: "Đang Chờ" });

			if (!skipPre) {
				runInfo({ now: `Bước 1`, end: `Bước 4`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
				heartbeat();
				await addIntoCart({ id: id, count: count });
				heartbeat();
	
				if (coupon !== "") {
					runInfo({ progress: 20, checkDetail: "Đang Áp Dụng Mã Giảm Giá" });
	
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
			}
			
			heartbeat();
			runInfo({ now: `Bước 2`, progress: 30, checkDetail: "Đang chọn địa chỉ Giao Hàng" });
			log(`Đang chọn địa chỉ Giao Hàng`);

			log(` + Đang lấy thông tin địa chỉ`);
			let shippingRAW = await myajax({
				url: `${HOSTADDRESS}/checkout/shipping`,
				method: "GET",
				type: "text"
			})

			heartbeat();
			runInfo({ progress: 40, progWarn: false });
			log(` + Đang phân tích thông tin`);
			let shippingDoc = (new DOMParser()).parseFromString(shippingRAW, "text/html");

			let CSRF_SHIPPING = shippingDoc.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
			log(` + CSRF: ${CSRF_SHIPPING}`);

			let shippingID = shippingDoc.querySelector("div.address-item.is-default > div > p.action > button.btn.saving-address").dataset.id;
			log(` + Đang chọn địa chỉ ID: ${shippingID}`);
			heartbeat();

			let selectAddress = await myajax({
				url: `${HOSTADDRESS}/checkout/shipping/ajaxSave`,
				method: "POST",
				form: {
					address_id: shippingID,
					TIKI_CSRF_TOKEN: CSRF_SHIPPING
				}
			})

			log(` + Chọn địa chỉ thành công!`);

			runInfo({ now: `Bước 3`, progress: 60, progWarn: false, checkDetail: "Đang lấy thông tin thanh toán" });
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

			runInfo({ now: `Bước 4`, progress: 80, progWarn: false, checkDetail: "Bắt đầu đặt hàng" });
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

				beaconNote.push(`------------------------------`);
				beaconNote.push(`METHOD    : ${paymentMethod}`);
				beaconNote.push(`CODE      : ${placeOrder.order_code}`);
				beaconNote.push(`TransID   : ${placeOrder.payment.transactionId}`);
			} else
				beaconNote.push(`METHOD    : ${paymentMethod}`);

			log(` + Thời gian     : ${orderTimer.stop}s`);
		}

		//? Order By Coupon Init
	
		if (settings.orderBy === "orderByCoupon") {
			runInfo({ now: `Bước 1`, end: `Bước 1`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			await addIntoCart({ id: PID, count: settings.orderCount });
			heartbeat();
			runInfo({ now: `Bước 1`, end: `Bước 1`, progress: 100, checkDetail: "Thêm vào Giỏ Hàng thành công!" });
		}

		__checkHandler();
		log("Bắt đầu kiểm tra giá");
	} catch(e) {
		triggerError(e);
		return;
	}
})()