// Script begin here
(async () => {
	const log = (text) => writeLog(text);

	var updateInfoInterval = null;
	var beaconNote = [];
	let BUTTON_ID = null;

	const HOSTADDRESS = "https://tiki.vn";

	onCancel(async (clean) => {
		clearInterval(updateInfoInterval);

		if (clean) {
			try {
				await command("removeButton", { id: BUTTON_ID });
			} catch(e) {
				clog("ERRR", `Errored While Removing Button ID ${BUTTON_ID}`, e);
			}
		}
	});

	try {
		log(`|===========================|`);
		log(`|     Tiki Instant Buy      |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 14:00:15 23/04/2020  |`);
		log(`|===========================|`);
	
		const getToken = async () => {
			let at = await core.getCookie("https://tiki.vn", "TIKI_ACCESS_TOKEN");
	
			if (!at || !at.value)
				return (await core.getCookie("https://tiki.vn", "TIKI_GUEST_TOKEN")).value
	
			return at.value;
		}

		// Get itemName
		var itemName = "";
		var itemInitPrice = 0;
		var thumbnail = null;
	
		try {
			itemName = (await command("queryText", { query: "#product-name > span:nth-child(3)" })).text
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
			return;
		}
	
		log("itemName: " + itemName);

		try {
			itemInitPrice = parseInt((await command("queryText", { query: "#span-price" })).text.replace(/\./gi, ""))
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemInitPrice not found)</i>");
			return;
		}
	
		log("itemInitPrice: " + itemInitPrice);

		try {
			thumbnail = (await command("eval", { script: `document.querySelector(\`head > meta[property="og:image"]\`).content` })).result
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(thumbnail not found)</i>");
			return;
		}
	
		// Get ID
		var ID = null;
		var PID = null;

		//? GET ITEM ID
		runInfo({ status: "running", info: "Đang lấy thông tin Item", progress: 0 });
	
		try {
			ID = parseInt((await command("queryInput", { query: "input#product_id" })).value)
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}
	
		runInfo({ progress: 20 });
		log(`Item ID: ${ID}`);

		try {
			PID = parseInt((await command("queryInput", { query: "input#product_id_add_cart" })).value)
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(PID not found)</i>");
			return;
		}
	
		runInfo({ progress: 40 });
		log(`Product ID: ${PID}`);

		let randomTikiPage = await myajax({
			url: `${HOSTADDRESS}/deal-hot`,
			method: "GET",
			type: "text"
		})

		let randomTikiDoc = (new DOMParser()).parseFromString(randomTikiPage, "text/html");
		const TIKI_CSRF_TOKEN = randomTikiDoc.querySelector(`input[name="TIKI_CSRF_TOKEN"]`).value;
		log(`🗝 CSRF: ${TIKI_CSRF_TOKEN}`);

		// Check for id change
		updateInfoInterval = setInterval(async () => {
			let _ID = null;
			let _PID = null;
	
			try {
				_ID = parseInt((await command("queryInput", { query: "input#product_id" })).value);
				_PID = parseInt((await command("queryInput", { query: "input#product_id_add_cart" })).value);
			} catch(e) {
				rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy!");
				return;
			}
			
			if (ID !== _ID || PID !== _PID) {
				log(`Phát hiện thay đổi`);
				log(` + ID : ${ID} -> ${_ID}`);
				log(` + PID: ${PID} -> ${_PID}`);
				ID = _ID;
				PID = _PID;
			}
		}, 1000);

		runInfo({ info: "Thiết lập cài đặt", progress: 60 });
		log("Đang thiết lập cài đặt");

		await config({
			note: { type: "note", level: "warning", text: "Chọn loại hàng trên trang sản phẩm" },
			orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
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
			accountList: { type: "textarea", label: "Danh sách tài khoản", height: "180px", value: "", required: true }
		});

		runInfo({ info: "Đang tạo nút",  progress: 80 });
		log("Creating Button");
		let btn = await command("createButton", {
			container: `#add-cart-action > div > div > div.cta-box`,
			color: "blue",
			text: `<h3 style="margin: unset">MUA NGAY</h3><br>ID: ${ID} PID: ${PID}`,
			style: {
				width: "calc(100% - 30px)",
				marginTop: "10px"
			}
		})

		BUTTON_ID = btn.id;
		runInfo({ progress: 100 });
		log(` + ID: ${BUTTON_ID}`);

		//! ======================================= MAIN ORDER LOGIC ZONE =======================================

		const __doOrder = async ({
			id = 0,
			count = 0,
			coupon = "",
			paymentMethod = "cod",
			username = "",
			password = "",
			shippingAddress = null
		}) => {
			sounds.notification();
			let orderTimer = new stopClock();

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

			log(`📥 Đăng nhập thành công`);

			log("Đang thêm Item vào Giỏ Hàng");
			runInfo({ progress: 20, info: "Đang thêm Item vào Giỏ Hàng" });
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
			} catch(e) { throw e }
	
			if (addData.error) {
				errored(`${username}: ${addData.error.message || "Không rõ"}`);
				log(" + Không thể thêm Item vào Giỏ");
				log(`    + Code: -1`);
				log(`    + MSG : ${addData.error.message || "Không rõ"}`);
				throw { code: -1, description: "Không thể thêm Item vào Giỏ", data: addData.error }
			}

			log(" + Thêm vào giỏ thành công!");

			if (coupon !== "") {
				runInfo({ progress: 30, info: "Đang Áp Dụng Mã Giảm Giá" });

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
			
			runInfo({ progress: 40, info: "Đang chọn địa chỉ Giao Hàng" });
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

			runInfo({ progress: 60, info: "Đang lấy thông tin thanh toán" });
			log(`Đang lấy thông tin Thanh Toán`);

			log(` + Đang nhận thông tin`);
			let paymentRAW = await command("ajax", {
				url: "/checkout/payment",
				method: "GET",
				type: "text"
			})
			
			log(` + Đang phân tích thông tin`);
			runInfo({ progress: 70 });
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

				await command("ajax", {
					url: "/checkout/payment/ajax_update_cart",
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

			if (this.settings.randomIp)
				this.settings.ip = [
					randBetween(1, 255),
					randBetween(1, 255),
					randBetween(1, 255),
					randBetween(1, 255)
				].join(".");

			if (this.settings.ip !== "") {
				log(` + Áp dụng địa chỉ IP: ${this.settings.ip}`);
				paymentData.customer_ip_address = this.settings.ip;
			}

			log(` + Gửi quà: false`);
			paymentData.is_sent_as_gift = 0;
			paymentData.is_gift_wrapping = 0;
			paymentData.gift_from = "";
			paymentData.gift_to = "";

			paymentData.is_using_card = 0;

			runInfo({ progress: 80, info: "Bắt đầu đặt hàng" });
			log(`Đang tiến hành đặt hàng`);

			log(` + Đang nhận thông tin`);
			let placeOrder = await command("ajax", {
				url: "/checkout/payment/ajax_check_place_order",
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
				errored(`${username}: ${placeOrder.message.content || "Không Rõ"}`);
				log(" + Lỗi khi Order Item");
				log(`    + Type: ${placeOrder.message.type}`);
				log(`    + MSG : ${placeOrder.message.content || "Không Rõ"}`);
				throw { code: -1, description: "Không thể tiến hành Order", data: placeOrder };
			}

			runInfo({ progress: 100, info: "Đặt hàng thành công" });
			log(" + doOrder đã hoàn thành!");
			log("=========== KẾT QUẢ ===========");

			if (paymentMethod === "momo") {
				log(` + Order Code    : ${placeOrder.order_code}`);
				log(` + TransactionID : ${placeOrder.payment.transactionId}`);
				log(` + payURL        : <a href="${placeOrder.payment.payUrl}" target="_blank">LINK</a>`);
				log(` + QR Code       : <a href="${placeOrder.payment.qrCode}" target="_blank">LINK</a>`);
				log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.payment.qrCode}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);

				beaconNote.push(`------------------------------`);
				beaconNote.push(`CODE      : ${placeOrder.order_code}`);
				beaconNote.push(`TransID   : ${placeOrder.payment.transactionId}`);
			} else

			log(` + Thời gian   : ${orderTimer.stop}s`);
		}

		const startOrder = async (e) => {
			clearInterval(updateInfoInterval);

			let successCount = 0;
			let accountList = this.settings.accountList
				.split("\n")
				.filter(String)
				.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null } });

			if (accountList.length === 0)
				throw { code: -1, description: "Danh sách tài khoản trống! Vui lòng liệt kê danh sách trong cài đặt của tikiInstant" }

			await command("editButton", {
				id: BUTTON_ID,
				color: "pink",
				disabled: true,
				text: `<h4 style="margin: unset">ĐANG ĐẶT MUA</h4><br>ID: ${ID} PID: ${PID}`
			});

			for (var orderNth = 0; orderNth < accountList.length; orderNth++) {
				let item = accountList[orderNth];

				runInfo({ status: "running", info: `Lần Mua ${orderNth + 1}/${accountList.length}` });
				log(`========== ACCOUNT ${orderNth + 1}/${accountList.length} ==========`);

				await command("editButton", {
					id: BUTTON_ID,
					text: `<h4 style="margin: unset">ĐANG ĐẶT MUA [ACC ${orderNth + 1}/${accountList.length}]</h4><br>U: ${item.u} ID: ${ID} PID: ${PID}`
				})

				try {
					await __doOrder({
						id: PID,
						count: this.settings.orderCount,
						coupon: this.settings.coupon,
						paymentMethod: this.settings.paymentMethod,
						username: item.u,
						password: item.p
					});
				} catch(e) {
					clog("ERRR", `doOrder ${item.u} [${PID}]`, e);
					errored(e);
					continue;
				}
				
				successCount++;
				log(`Mua thành công cho tài khoản ${item.u}! (${orderNth + 1}Nth)`);
			}

			await command("editButton", {
				id: BUTTON_ID,
				color: (successCount === 0) ? "red" : ((successCount === accountList.length) ? "green" : "yellow"),
				disabled: false,
				text: `<h4 style="margin: unset">ĐÃ ĐẶT MUA ${successCount}/${accountList.length} TÀI KHOẢN</h4><br>ID: ${ID} PID: ${PID}`
			})

			complete(`ĐÃ ĐẶT MUA ${successCount}/${accountList.length} TÀI KHOẢN`);
			runInfo({ status: (successCount === 0) ? "errored" : ((successCount === accountList.length) ? "complete" : "warning") })

			if (successCount !== 0) {}
				// await sendBeacon({
				// 	script: SCRIPT.id,
				// 	name: itemName,
				// 	link: `${HOSTADDRESS}/item-p${ID}.html`,
				// 	price: itemInitPrice,
				// 	count: successCount,
				// 	thumbnail: thumbnail,
				// 	note: [
				// 		`ID        : ${ID}`,
				// 		`PID       : ${PID}`,
				// 		`METHOD    : ${this.settings.paymentMethod}`,
				// 		...beaconNote
				// 	].join("\n")
				// });
		}

		runInfo({ status: "waiting", info: "Đang chờ người dùng đặt mua", progress: "HOLD" });
		command("awaitButton", { id: BUTTON_ID })
			.then(e => startOrder().catch(e => triggerError(e)));
		
	} catch(e) {
		triggerError(e);
		return;
	}
})()