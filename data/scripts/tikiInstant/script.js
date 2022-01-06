// Script begin here
(async () => {
	const log = (text) => writeLog(text);
	const heartbeat = () => {}

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
		log(`|      Tiki Instant Buy     |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 14:46:25 24/03/2021  |`);
		log(`|===========================|`);
	
		// Get itemName
		var itemName = "";
		var itemInitPrice = null;
		var updateItemData = true;
		var itemData = {}
		var thumbnail = null;
	
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
	
		// Get ID
		var ID = null;
		var PID = null;

		const fetchItemData = async () => {
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

			let _pid = null;

			if (itemData.current_seller)
				_pid = parseInt(itemData.current_seller.product_id);

			if (_pid !== PID) {
				log(`PID Change: ${PID} -> ${_pid} (2)`);
				PID = _pid;
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

			return {
				price: parseInt(itemPrice),
				oldPrice: parseInt(itemOldPrice),
				thumbnail: itemData.thumbnail_url,
				status: itemStatus,
				qty: parseInt(itemQTY)
			}
		}

		//? GET ITEM ID
		let urlRe = /(?:http|https):\/\/tiki\.vn\/.*\-p(\d+)\.html.*/gm.exec(this.core.page.url.href)

		if (!urlRe || !urlRe[1]) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}

		ID = parseInt(urlRe[1]);
	
		log(`Item ID: ${ID}`);
		runInfo({ progress: 20 });

		thumbnail = (await fetchItemData()).thumbnail;
		runInfo({ progress: 40 });

		// Check for id change
		updateInfoInterval = setInterval(async () => {
			let _ID = null;
			let _PID = null;

			let urlRe = /(?:http|https):\/\/tiki\.vn\/.*\-p(\d+)\.html\?.+spid=(\d+).*/gm.exec(this.core.page.url.href);

			if (!urlRe || !urlRe[1])
				return;

			if (!urlRe || !urlRe[2])
				return;
	
			_ID = parseInt(urlRe[1]);
			_PID = parseInt(urlRe[2]);
			
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
			paymentMethod: {
				type: "radio",
				label: "Phương Thức Thanh Toán",
				required: true,
				list: [
					{ name: `Thanh Toán Khi Nhận Hàng`, color: "pink", value: "cod", checked: true },
					{ name: `Ví Momo`, color: "blue", value: "momo" }
				]
			},
			accountList: { type: "textarea", label: "Danh sách tài khoản", height: "180px", value: "", required: true },
			xPlatform: { type: "text", label: "X-Platform", value: "frontend-desktop" }
		});

		runInfo({ info: "Đang tạo nút",  progress: 80 });
		log("Creating Button");
		let btn = await command("createButton", {
			container: `.add-to-cart`,
			color: "blue",
			text: `<h3 style="margin: unset; font-size: 22px;">MUA NGAY</h3><br>ID: ${ID} PID: ${PID}`,
			style: {
				display: "block",
				marginTop: "10px"
			}
		})

		BUTTON_ID = btn.id;
		runInfo({ progress: 100 });
		log(` + ID: ${BUTTON_ID}`);


		//! |===============================|
		//! |       ORDER MAIN LOGIC        |
		//! |===============================|

		const __switchAccount = async ({
			username = null,
			password = null
		} = {}) => {
			let loginTimer = new StopClock();

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
			let orderTimer = new StopClock();

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
					"X-Platform": this.settings.xPlatform
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
			log("🛒 doOrder đã hoàn thành!");
			log("=============== KẾT QUẢ ===============");
			log(` + Order Code    : ${placeOrder.redirect_data.order_code}`);
			log(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);

			beaconNote.push(`🛒 ID ${placeOrder.redirect_data.order_code}`);
			beaconNote.push(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);

			if (paymentMethod === "momo") {
				log(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
				log(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);

				if (!isInjectedAccount) {
					log(` + payURL        : <a href="${placeOrder.qr_code}" target="_blank">LINK</a>`);
					log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
				}

				beaconNote.push(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
				beaconNote.push(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
			}

			log(`⌚ Thời gian     : ${orderTimer.stop}s`);
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
					await __switchAccount({
						username: item.u,
						password: item.p
					})

					await __doOrder({
						id: PID,
						count: this.settings.orderCount,
						coupon: this.settings.coupon,
						paymentMethod: this.settings.paymentMethod
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

			if (successCount !== 0) {
				await sendBeacon({
					script: SCRIPT.id,
					name: itemName,
					link: `${HOSTADDRESS}/item-p${ID}.html`,
					price: itemInitPrice,
					count: successCount,
					thumbnail: thumbnail,
					note: [
						`ID        : ${ID}`,
						`PID       : ${PID}`,
						`METHOD    : ${this.settings.paymentMethod}`,
						...beaconNote
					].join("\n")
				});
			}
		}

		runInfo({ status: "waiting", info: "Đang chờ người dùng đặt mua", progress: "HOLD" });
		command("awaitButton", { id: BUTTON_ID })
			.then(e => startOrder().catch(e => triggerError(e)));
		
	} catch(e) {
		triggerError(e);
		return;
	}
})()