//! |===============================|
//! |       ORDER MAIN LOGIC        |
//! |===============================|

const HOSTADDRESS = "https://tiki.vn";
let updateItemData = true;
let itemInitPrice = null;
let apiToken = null;
let guestToken = null;
let itemData = {}
let beaconNote = []

let ID = null;
let PID = null;
let CFID = null;

const getToken = async (retry = true, guestTokenAsFallback = false) => {
	let at = await this.getCookie("https://tiki.vn", "TIKI_ACCESS_TOKEN");
	if (at && at.value) {
		apiToken = at.value;
		return at.value;
	} else if (apiToken)
		return apiToken;

	let gt = await this.getCookie("https://tiki.vn", "TIKI_GUEST_TOKEN");
	if (gt && gt.value) {
		guestToken = gt.value;
		return gt.value;
	} else if (guestToken)
		return guestToken;

	if (retry) {
		if (guestTokenAsFallback) {
			writeLog("🔐 Đang lấy Token Khách 👤");
			let tokens = await myajax({
				url: `${HOSTADDRESS}/api/v2/tokens`,
				method: "POST",
				json: {
					grant_type: "guest"
				}
			});

			apiToken = null;
			guestToken = tokens.guest_token;
			return guestToken;
		}

		writeLog("🔐 Cập nhật Cookies 🍪");
		await myajax({
			url: `${HOSTADDRESS}/api/v2/me`,
			method: "GET"
		});

		return (await getToken(false));
	} else
		throw { code: -1, description: "Tiki Token Not Found" }
}

const getBlackList = async () => {
	let data = await this.dataLoad("tikiHuntBlackList");
	return Object.keys(data.tikiHuntBlackList || {}).map(i => parseInt(i));
}

const saveBlackList = async (list) => {
	let listObj = {}
	for (let i of list)
		if (!isNaN(i) && i !== "")
			listObj[i] = true;

	await this.dataSave({ tikiHuntBlackList: listObj });
}

const fetchItemData = async (updateInfo = true) => {
	if (updateItemData) {
		itemData = await myajax({
			url: `${HOSTADDRESS}/api/v2/products/${ID}`,
			method: "GET",
			changeState: false
		});

		if (ID !== itemData.id) {
			writeLog(`ID Change: ${ID} -> ${itemData.id}`);
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

			writeLog(`Config ID: ${CFID}`);
			await delayAsync(400);
		}

		if (CFID !== "custom")
			for (let item of itemData.configurable_products)
				if (item.child_id === CFID) {
					itemPrice = item.price;
					itemStatus = item.inventory_status;

					if (item.id !== PID) {
						writeLog(`PID Change: ${PID} -> ${item.id} (1)`);
						PID = parseInt(item.id);
					}

					break;
				}
	} else {
		let _pid = PID;

		if (itemData.current_seller)
			_pid = parseInt(itemData.current_seller.product_id);

		if (_pid !== PID) {
			writeLog(`PID Change: ${PID} -> ${_pid} (2)`);
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
			writeLog("⚠ Tiki trả về mã lỗi");
			writeLog(` + Code : ${data.error.code}`);
			writeLog(` + MSG  : ${data.error.message}`);
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

const __switchAccount = async ({
	username = null,
	password = null,
	logOut = false,
	censor = false,

	info = runInfo,
	log = writeLog,
	panic = errored,
	clog = window.clog,
	myajax = window.myajax
} = {}) => {
	if (logOut) {
		log(`📤 Đang đăng xuất`);

		try {
			await myajax({
				url: `${HOSTADDRESS}/api/v2/account/logout`,
				method: "GET",
				header: {
					"X-Access-Token": await getToken()
				}
			});

			log("📤 Đăng xuất thành công");
			return;
		} catch(e) {
			clog("ERRR", `logout(${censor ? "" : username}): `, e);
			log("📤 Không thể đăng xuất! Tool sẽ coi như đăng xuất thành công và tiếp tục chạy!");
			log(` + Code: ${e.code}`);
			log(` + MSG : ${e.description || "Không rõ"}`);
		}
	}

	if (!username || !password)
		throw { code: -1, description: "Tên đăng nhập hoặc mật khẩu bị thiếu" }

	let loginTimer = new stopClock();

	heartbeat();

	if (censor)
		log(`📥 Đang đăng nhập`);
	else
		log(`📥 Đang đăng nhập vào \"${username}\"`);
		
	info({ now: `Bước 1`, end: `Bước 5`, progress: 10, checkDetail: "Đang đăng nhập" });
	let loginResponse = {}

	try {
		loginResponse = await myajax({
			url: `${HOSTADDRESS}/api/v3/tokens`,
			method: "POST",
			json: {
				"email": username,
				"grant_type": "password",
				"password": password
			}
		});
	} catch(e) {
		if (!e.data)
			throw e;

		log("📥 Tiki trả về mã lỗi");
		log(` + Code: ${e.data.data.error.code}`);
		log(` + MSG : ${e.data.data.error.message || "Không rõ"}`);
		
		if (e.data.data.error.errors)
			for (let item of e.data.data.error.errors) {
				log(`  + FIELD   : ${item.field}`);
				log(`  + MESSAGE : ${item.message || "Không rõ"}`);
			}

		throw { code: -1, description: "Thất bại khi đăng nhập vào tài khoản", data: e.data.data }
	}

	if (loginResponse.error) {
		log(`📥 Không thể đăng nhập vào tài khoản`);
		log(` + Code: ${loginResponse.error.code || "Không Rõ"}`);
		log(` + MSG : ${loginResponse.error.message || "Không Rõ"}`);
		throw { code: loginResponse.error.code, description: loginResponse.error.message, data: loginResponse.error }
	}

	log("📤 Cập nhật Cookies 🍪");
	await myajax({
		url: `${HOSTADDRESS}/api/v2/me`,
		method: "GET",
		header: {
			"X-Access-Token": loginResponse.access_token,
		}
	})

	log(`📥 Đăng nhập thành công (${loginTimer.stop}s)`);
	log(` + CustomerID : ${loginResponse.customer_id}`);
	log(` + Expires    : ${loginResponse.expires_in}`);
	apiToken = loginResponse.access_token;
	guestToken = null;

	return { token: loginResponse.access_token }
}

const addIntoCart = async ({
	id = 0,
	count = 0,
	token = null,

	info = runInfo,
	log = writeLog,
	panic = errored,
	clog = window.clog,
	myajax = window.myajax
} = {}) => {
	log(`🛒 Đang thêm Item ${id} C:${count} vào Giỏ Hàng`);
	let addData = {}

	if (!token)
		throw { code: -1, description: "Chưa Xác Định Access Token" }

	try {
		addData = await myajax({
			url: `${HOSTADDRESS}/api/v2/carts/mine/items`,
			method: "POST",
			header: {
				"X-Access-Token": token
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
		await panic("Lỗi khi thêm Item vào Giỏ");
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
	token = null,
	itemInit = true,
	paymentMethod = "cod",
	shippingAddress = null,
	isInjectedAccount = false,
	platform = "frontend-desktop",
	accountDisabledHandler = async () => {},

	info = runInfo,
	log = writeLog,
	panic = errored,
	clog = window.clog,
	myajax = window.myajax
}) => {
	sounds.notification();
	let orderTimer = new stopClock();

	if (!token)
		throw { code: -1, description: "Chưa Xác Định Access Token" }

	if (itemInit) {
		info({ now: `Bước 1`, end: `Bước 4`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
		heartbeat();
		await addIntoCart({
			id: id,
			count: count,
			token,

			info,
			log,
			clog,
			myajax
		});
		heartbeat();

		if (coupon !== "") {
			info({ progress: 20, checkDetail: "Đang Áp Dụng Mã Giảm Giá" });

			log(`🎫 Đang áp dụng Coupon: ${coupon}`);

			try {
				await myajax({
					url: `${HOSTADDRESS}/api/v2/carts/mine/coupons/${coupon}`,
					method: "PUT",
					header: { token }
				})
			} catch(e) {
				await panic("Lỗi khi áp dụng mã Coupon");
				log("⚠ Tiki trả về mã lỗi");
				log(` + MSG  : ${e.error.message}`);
				throw { code: -1, description: e.error.message, data: e.error }
			}

			log(`🎫 Áp dụng Coupon thành công!`);
		}
	}
	
	heartbeat();
	info({ now: `Bước 2`, progress: 30, checkDetail: "Đang chọn địa chỉ Giao Hàng" });
	log(`🏡 Đang chọn địa chỉ Giao Hàng`);
	let shippingID = shippingAddress;

	if (!shippingID) {
		log(`🏡 Đang lấy thông tin địa chỉ`);
		let addressBook = await myajax({
			url: `${HOSTADDRESS}/api/v2/me/addresses`,
			method: "GET",
			header: {
				"X-Access-Token": token,
				apikey: null
			},
			query: {
				page: 1,
				limit: 30
			}
		})

		if (addressBook.error) {
			await panic("Lỗi khi lấy ID Địa Chỉ");
			log("⚠ Tiki trả về mã lỗi");
			log(` + Code : ${addressBook.error.code}`);
			log(` + MSG  : ${addressBook.error.message}`);
			throw { code: addressBook.error.code, description: addressBook.error.message, data: addressBook.error }
		}

		heartbeat();
		info({ progress: 50, progWarn: false });
		log(`🏡 Đang phân tích thông tin`);
		
		shippingID = addressBook.data.filter(i => (i.is_default && i.id));

		if (!shippingID[0]) {
			await panic("Lỗi khi lấy ID Địa Chỉ");
			log("🏡 Không tìm thấy địa chỉ mặc định");
			throw { code: -1, description: "Không tìm thấy địa chỉ mặc định", data: addressBook.data }
		}

		shippingID = shippingID[0].id;
	} else
		log(`🏡 Địa chỉ được định sẵn! Bỏ qua lấy thông tin địa chỉ`);

	log(`🏡 Đang chọn địa chỉ ID: ${shippingID}`);
	heartbeat();

	let applyAddress = await myajax({
		url: `${HOSTADDRESS}/api/v2/carts/mine/shippings_addresses/${shippingID}`,
		method: "PUT",
		header: {
			"X-Access-Token": token
		}
	})
	
	if (applyAddress.error) {
		await panic("Lỗi khi áp dụng Địa Chỉ");
		log("⚠ Tiki trả về mã lỗi");
		log(` + Code: ${applyAddress.error.code}`);
		log(` + MSG : ${applyAddress.error.message || "Không Rõ"}`);
		throw { code: -1, description: "Không thể chọn địa chỉ", data: applyAddress.error }
	}

	info({ now: `Bước 3`, progress: 60, progWarn: false, checkDetail: "Thay đổi cài đặt thanh toán" });
	log(`🛒 Đang lấy thông tin Thanh Toán`);
	heartbeat();

	let doCartVerify = false;

	let cartInfo = await myajax({
		url: `${HOSTADDRESS}/api/v2/carts/mine`,
		method: "GET",
		header: {
			"X-Access-Token": token
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
		await panic("Lỗi khi lấy Giỏ Hàng");
		log("⚠ Tiki trả về mã lỗi");
		log(` + Code: ${cartInfo.error.code}`);
		log(` + MSG : ${cartInfo.error.message || "Không Rõ"}`);
		throw { code: -1, description: "Không thể lấy Giỏ Hàng", data: cartInfo.error }
	}

	if (typeof cartInfo.messages === "object")
		for (let item of cartInfo.messages) {
			if (item.type !== "error")
				continue;

			await panic("Lỗi khi lấy Giỏ Hàng");
			log("⚠ Tiki trả về mã lỗi");
			log(` + Code: ${item.error_code}`);
			log(` + MSG : ${item.message || "Không Rõ"}`);

			if (item.message.includes(`Tài khoản của bạn không thể tiếp tục thanh toán`)) {
				log(`⛔ Tài khoản đã bị khóa!`);
				await accountDisabledHandler();
			}

			throw { code: -1, description: "Lấy Giỏ Hàng có lỗi", data: item }
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
					"X-Access-Token": token
				}
			})
		} catch(e) {
			await panic("Lỗi khi thay đổi phương thức thanh toán");
			log(`⚠ Lỗi khi gửi yêu cầu`);
			log(` + Code: ${e.code}`);
			log(` + MSG : ${e.message || "Không Rõ"}`);
			throw { code: -1, description: "Không thể đổi phương thức thanh toán", data: e }
		}

		if (changeMethod.error) {
			await panic("Lỗi khi thay đổi phương thức thanh toán");
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
							"X-Access-Token": token
						}
					})
				} catch(e) {
					await panic("Lỗi khi chuyển sang Tiki Now");
					log(`⚠ Lỗi khi gửi yêu cầu`);
					log(` + Code: ${e.code}`);
					log(` + MSG : ${e.message || "Không Rõ"}`);
					throw { code: -1, description: "Không thể chuyển sang Tiki Now", data: e }
				}

				if (shipPlan.error) {
					await panic("Lỗi khi chuyển sang Tiki Now");
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
				"X-Access-Token": token
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
			await panic("Lỗi khi thay đổi phương thức thanh toán");
			log(`⚠ Xác thực lại không khớp`);
			log(` + Current : ${cartInfo.last_payment_method.method}`);
			log(` + Expected: ${paymentMethod}`);
			throw { code: -1, description: "Không thể đổi phương thức thanh toán", data: cartInfo.last_payment_method }
		}

		for (let item of cartInfo.shipping_methods)
			if (item.id === 3 && item.is_disabled === false && item.is_selected !== true) {
				await panic("Lỗi khi chuyển sang Tiki Now");
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
	log(`----------------------------------`);
	log(`💵 Tạm tính   : <a class="price">${priceFormat(cartInfo.subtotal)}</a>`);
	log(`💵 Vận chuyển : <a class="price">${priceFormat(cartInfo.shipping_amount)}</a>`);
	log(`💵 THÀNH TIỀN : <a class="price" style="font-size: 26px;">${priceFormat(cartInfo.grand_total)}</a>`);

	info({ now: `Bước 4`, progress: 80, progWarn: false, checkDetail: "Bắt đầu đặt hàng" });
	log(`🛒 Đang tiến hành đặt hàng`);
	heartbeat();

	let placeOrder = await myajax({
		url: `${HOSTADDRESS}/api/v2/carts/mine/checkout`,
		method: "POST",
		header: {
			"X-Access-Token": token,
			"X-Platform": platform
		},
		json: {
			cybersource_information: {},
			payment: { method: paymentMethod, option_id: null },
			tax_info: null
		}
	})

	if (placeOrder.error) {
		await panic("Lỗi khi tiến hành Đặt Hàng");
		log("⚠ Tiki trả về mã lỗi");
		log(` + Code: ${placeOrder.error.code}`);
		log(` + MSG : ${placeOrder.error.message || "Không Rõ"}`);
		throw { code: -1, description: "Không thể tiến hành Order", data: placeOrder.error }
	}

	info({ progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công" });
	heartbeat();

	if (isInjectedAccount) {
		log("⚠ Tiki trả về mã lỗi");
		log(` + Code: 450`);
		log(` + MSG : Sản phẩm đã thay đổi giá! Vui lòng cập nhật lại giỏ hàng của bạn`);

		beaconNote.push(`🛒 ID ${placeOrder.redirect_data.order_code} [🚪]`);
		beaconNote.push(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);

		switch (paymentMethod) {
			case "momo":
				beaconNote.push(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
				beaconNote.push(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
				beaconNote.push(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
				break;
		
			case "zalopay":
				beaconNote.push(` + AppID             : ${placeOrder.payment.data.appid}`);
				beaconNote.push(` + Transaction Token : ${placeOrder.payment.data.zptranstoken}`);
				beaconNote.push(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);
				break;
		}
	} else {
		log("🛒 doOrder đã hoàn thành!");
		log("============ KẾT QUẢ ============");
		log(` + Order Code    : ${placeOrder.redirect_data.order_code}`);
		log(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);

		beaconNote.push(`🛒 ID ${placeOrder.redirect_data.order_code}`);
		beaconNote.push(` + Thành Tiền    : ${placeOrder.redirect_data.amount}`);

		switch (paymentMethod) {
			case "momo":
				log(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
				log(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
				
				log(` + payURL        : <a href="${placeOrder.qr_code}" target="_blank">LINK</a>`);
				log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);

				beaconNote.push(` + Merchant Code : ${placeOrder.payment.data.merchant_code}`);
				beaconNote.push(` + TransactionID : ${placeOrder.payment.data.transaction_id}`);
				break;
		
			case "zalopay":
				log(` + AppID             : ${placeOrder.payment.data.appid}`);
				log(` + Transaction Token : ${placeOrder.payment.data.zptranstoken}`);
				
				log(`<img src="https://ops-api.tiki.vn/barcode?barcode=${placeOrder.qr_code}&type=qrcode&width=200&height=200" style="display: block; margin: auto; padding: 10px 28px 10px 0;" >`);

				beaconNote.push(` + AppID             : ${placeOrder.payment.data.appid}`);
				beaconNote.push(` + Transaction Token : ${placeOrder.payment.data.zptranstoken}`);
				break;
		}
	}

	log(`⌚ Thời gian     : ${orderTimer.stop}s`);
}

const __clearCart = async ({
	token = null,

	info = runInfo,
	log = writeLog,
	panic = errored,
	clog = window.clog,
	myajax = window.myajax
}) => {
	heartbeat();

	if (!token)
		throw { code: -1, description: "Chưa Xác Định Access Token" }

	log(`🛒 Đang lấy danh sách giỏ hàng`);
	info({ now: `Bước 1`, end: `Bước 6`, progress: 0, checkDetail: "Đang lấy danh sách" });

	let cartList = await myajax({
		url: `${HOSTADDRESS}/api/v2/carts/mine`,
		method: "GET",
		header: {
			"X-Access-Token": token
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
		await panic("Lỗi khi lấy thông tin Giỏ Hàng");
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
					"X-Access-Token": token
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