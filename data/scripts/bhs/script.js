// Script begin here
(async () => {
	var updateInfoInterval = null;
	var infoUpdateInterval = null;
	var doCheck = true;

	onCancel(() => {
		clearInterval(updateInfoInterval);
		clearInterval(infoUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);

	const parseSchema = (url) => {
		return /(?:https|http):\/\/schema\.org\/(.*)/gm.exec(url)[1];
	}

	try {
		log(`|===========================|`);
		log(`|   BachHoaXanh Auto v001   |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 16:48:45 13/03/2020  |`);
		log(`|===========================|`);
	
		// Get itemName
		var itemName = "";
	
		try {
			itemName = (await command("queryText", { query: "body > section > aside.colcontent > div.rowdetail > aside.infosell > .nameproduct" })).text
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
			return;
		}
	
		log("itemName: " + itemName);
		info({ title: itemName });
		var itemInitPrice = 0;
		var itemURL = core.page.url.href;
	
		// Get ID
		var ID = null;

		const fetchItemData = async () => {
			let html = await myajax({
				url: itemURL,
				method: "GET",
				type: "text"
			})

			let dom = (new DOMParser()).parseFromString(html, "text/html");
			return JSON.parse(dom.querySelector(`body > script[type="application/ld+json"]`).innerText);
		}

		const updateItemData = async () => {
			let data = await fetchItemData();

			clog("DEBG", data);
	
			itemInitPrice = data.Offers.Price;
			info({
				id: ID,
				price: priceFormat(data.Offers.Price),
				tags: [
					`SKU: ${data.SKU}`,
					`Condition: ${parseSchema(data.Offers.ItemCondition)}`,
					`Availability: ${parseSchema(data.Offers.Availability)}`
				]
			})
		}

		//? GET ITEM ID
	
		try {
			ID = parseInt((await command("queryDataset", { query: "body > section > aside.colcontent > div.rowdetail > aside.infosell > a.choosebuy", dataset: "id" })).data)
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}
	
		log(`Item ID: ${ID}`);
		await updateItemData();
	
		// Check for id change
		updateInfoInterval = setInterval(async () => {
			let _ID = null;
	
			try {
				_ID = parseInt((await command("queryDataset", { query: "body > section > aside.colcontent > div.rowdetail > aside.infosell > a.choosebuy", dataset: "id" })).data);
			} catch(e) {
				rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy!");
				return;
			}
			
			if (ID !== _ID) {
				log(`Phát hiện thay đổi`);
				log(` + ID : ${ID} -> ${_ID}`);
				ID = _ID;

				await updateItemData();
			}
		}, 1000);
	
		log("Đang chờ cài đặt từ người dùng");
		// Wait for settings
		const settings = await setup({
			note: { type: "note", level: "warning", text: "Chọn loại hàng trên trang sản phẩm. Tool sẽ tự động làm mới loại hàng và giá" },
			orderByPrice: { type: "switch", label: "Mua theo giá sản phẩm", name: "orderBy", value: true },
			orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, required: true },
			orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
			reCheckPrice: { type: "number", label: "Kiểm tra lại giá", value: 5, depend: "orderBy:orderByPrice" },
			checkInterval: { type: "number", label: "Khoảng kiểm tra", value: 200, required: true },
			autoReOrder: { type: "checkbox", label: "Tự động mua lại", color: "pink", depend: "orderBy:orderByPrice" },
			autoReOrderTimes: { type: "number", label: "Số lần tự động mua lại", value: 2, depend: "autoReOrder" },
		});
	
		log("CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		clearInterval(updateInfoInterval);
		run();
		
		// Start
		var checkNth = 0;
		var start = time();
	
		runInfo({
			end: settings.checkInterval + "ms",
			target: settings.orderPrice
		});
	
		var checker = async () => {
			checkNth++;
	
			let reqStart = time();
			let data = {}
			try {
				data = await fetchItemData();
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
	
			var currentPrice = data ? data.Offers.Price : null;
			let reqTime = ((time() - reqStart) * 1000);
			let reqTimeAT = (reqTime / settings.checkInterval) * 100;
			let availability = parseSchema(data.Offers.Availability);
			let successCount = 0;
	
			runInfo({
				progress: reqTimeAT,
				now: reqTime.toFixed(2) + "ms",
				current: currentPrice ? currentPrice : "Không Rõ",
				saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
				itemStatus: (availability === "InStock") ? `CÓ HÀNG` : `KHÔNG CÒN HÀNG (${availability})`,
				itemStatusColor: (availability === "InStock") ? "green" : "red",
				checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
			})

			heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

			if (typeof currentPrice === "number" && currentPrice < settings.orderPrice && availability === "InStock") {
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
								_cp = await fetchItemData();

								runInfo({
									current: _cp.Offers.Price,
									saved: ((_cp.Offers.Price - itemInitPrice) / itemInitPrice) * 100,
								});
							} catch(e) {
								log(" + Lỗi đã xảy ra khi lấy thông tin Item");
								log(`    + Code: -1`);
								log(`    + Bỏ qua lỗi: true`);
							} finally {
								if (_cp.Offers.Price >= settings.orderPrice) {
									await errored(`Giá đã thay đổi`);
									log(" + Giá đã bị thay đổi");
									log(`    + Code: -1`);
									log(`    + NP  : ${priceFormat(_cp.Offers.Price)}`);
									log(`    + Đang dừng chạy`);
									break;
								}

								log(` + Giá chưa thay đổi. Tiếp tục chạy`);
							}
						}

						try {
							await __doOrder({
								id: ID,
								count: settings.orderCount
							});
						} finally {
							successCount++;
						}

						heartbeat();
						log(`Mua thành công item thứ ${orderNth}!`);
					}
				else
					await __doOrder({
						id: ID,
						count: settings.orderCount,
						coupon: settings.coupon,
						paymentMethod: settings.paymentMethod
					});
	
				complete();
				runInfo({
					itemStatus: `ĐÃ ĐẶT ${settings.autoReOrder ? successCount : settings.orderCount} items`,
					itemStatusColor: settings.autoReOrder ? (successCount === settings.autoReOrderTimes ? "green" : "yellow") : "green",
					progress: 100,
					progWarn: false,
					checkDetail: "Đặt hàng thành công"
				});

				await command("changeLocation", { href: "/sales/order/history" });
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
		//! |       ADD TO CART        |
		//! |==========================|

		const addIntoCart = async ({
			id = 0,
			count = 0,
		} = {}) => {
			log(`Đang thêm Item ${id} C:${count} vào Giỏ Hàng`);
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
					await command("ajax", {
						url: "/checkout/cart/ajaxCoupon",
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
			let shippingRAW = await command("ajax", {
				url: "/checkout/shipping",
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

			let selectAddress = await command("ajax", {
				url: "/checkout/shipping/ajaxSave",
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

			log(` + Phương thức thanh toán: ${paymentMethod.toUpperCase()}`);
			paymentData.selected_payment_method = paymentMethod;

			if (paymentDoc.getElementById("plan-3")) {
				log(` + Phát hiện Tiki Now!`);
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

			if (paymentMethod === "momo") {
				log(` + Order Code    : ${placeOrder.order_code}`);
				log(` + TransactionID : ${placeOrder.payment.transactionId}`);
				log(` + payURL        : <a href="${placeOrder.payment.payUrl}" target="_blank">LINK</a>`);
				log(` + QR Code       : <a href="${placeOrder.payment.qrCode}" target="_blank">LINK</a>`);
				log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.payment.qrCode}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
			}

			log(` + Thời gian     : ${orderTimer.stop}s`);
		}

		//? Order By Coupon Init
	
		if (settings.orderBy === "orderByCoupon") {
			runInfo({ now: `Bước 1`, end: `Bước 1`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			await addIntoCart({ id: ID, count: settings.orderCount });
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