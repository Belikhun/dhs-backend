// Script begin here
(async () => {
	var infoUpdateInterval = null;
	var doCheck = true;

	onCancel(() => {
		clearInterval(infoUpdateInterval);
		doCheck = false;
	})

	const HOSTADDRESS = `https://shopee.vn`;

	const log = (text) => writeLog(text);

	const craftURL = (url, query) => {
		let queryKey = Object.keys(query);
		for (let key of queryKey)
			url += `${(queryKey[0] === key) ? "?" : ""}${key}=${query[key]}${(queryKey[queryKey.length - 1] !== key) ? "&" : ""}`;
			
		return encodeURIComponent(url);
	}

	//* ================================= BEGIN ENCRYPT/DECRYPT =================================

	const C = { LEFT: 0, RIGHT: 1 }
	const calcOffset = (hash) => Array.from({ length: 8 }).map((v, i) => Math.max(Math.pow(2, i) - 1, 0)).reduce((a, v) => a + hash[v].charCodeAt(0), 0) % 32;

	const rejoinString = (data, { offset, direction = C.LEFT } = {}) => {
		if (!offset)
			return data;
	
		if (direction === C.LEFT)
			return "" + data.substr(offset) + data.substr(0, offset);
	
		if (direction === C.RIGHT)
			return "" + data.substr(data.length - offset) + data.substr(0, data.length - offset);
	
		return data;
	}

	const encrypt = (t, hash, r) => {
		var n = rejoinString(hash.substr(0, 16) + hash.substr(hash.length - 16), { direction: C.LEFT, offset: calcOffset(hash) });
		log("🔑 ENCRYPT SECRET:");
		log(`  + ${n}`);

		var _ = undefined;
		var E = "0123456789abcdef";
		n = CryptoJS.enc.Utf8.parse(n);
		var a = CryptoJS.enc.Utf8.parse(t);
		CryptoJS.pad.Pkcs7.pad(a, 4);
		var c, s = CryptoJS.enc.Hex.stringify(a), f = r || (c = 32, Array.from({ length: c }).map(() => E[Math.floor(16 * Math.random())]).join("")),
			_ = CryptoJS.enc.Hex.parse(f + s),
			h = CryptoJS.enc.Hex.parse(CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256)(_).toString().substr(0, 32)),
			m = _.concat(h), O = CryptoJS.enc.Utf8.parse("\0".repeat(32));
	
		return CryptoJS.AES.encrypt(m, n, {
			iv: O,
			padding: CryptoJS.pad.NoPadding
		}).ciphertext.toString()
	}

	const decrypt = (e, hash) => {
		let sec = rejoinString(hash.substr(48, 32), { direction: C.RIGHT, offset: calcOffset(hash) });
		log("🔑 DECRYPT SECRET:");
		log(`  + ${sec}`);

		let t = CryptoJS.enc.Utf8.parse(sec);
		let n = CryptoJS.enc.Hex.parse(e)
		let r = CryptoJS.AES.decrypt({ ciphertext: n }, t, {
			iv: CryptoJS.enc.Utf8.parse("\0".repeat(32)),
			padding: CryptoJS.pad.NoPadding
		}).toString(CryptoJS.enc.Hex);
	
		let a = r.slice(r.length - 32)
		let c = r.slice(0, r.length - 32);
	
		if (a !== CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256)(CryptoJS.enc.Hex.parse(c)).toString().substr(0, 32))
			throw { code: -1, description: "Checksum does not match for decrypted message", data: r }
	
		let s = CryptoJS.enc.Hex.parse(c.slice(32));
		CryptoJS.pad.Pkcs7.unpad(s);
	
		return s.toString(CryptoJS.enc.Utf8);
	}

	//* ================================= END ENCRYPT/DECRYPT =================================

	try {
		log(`|===========================|`);
		log(`|      Shopee Auto v009     |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 23:38:29 02/01/2020  |`);
		log(`|===========================|`);

		// Get itemName
		var itemName = "";
	
		try {
			itemName = (await command("queryText", { query: `div > div.qaNIZv > span` })).text;
		} catch(e) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
			return;
		}
	
		log("itemName: " + itemName);
		info({ title: itemName });
		var itemInitPrice = 0;
	
		// Get ID
		var ID = null;
		var SID = null;
		var HAVE_VARIATIONS = false;
		var MODEL_ID = null;
		var MODEL_KEY = null;
		var CSRF = (await command("getCookie", { key: "csrftoken" })).csrftoken;

		if (!CSRF) {
			rejectSetup(`Không tìm thấy <b>CSRF</b> Token. <br><i>(Thử đăng nhập lại vào tài khoản Shopee)</i>`)
			return;
		}

		log(`CSRF: ${CSRF}`);

		// Define
		const updateItemData = async () => {
			let data = await myajax({
				url: `${HOSTADDRESS}/api/v2/item/get`,
				method: "GET",
				query: {
					itemid: ID,
					shopid: SID
				}
			});

			let status = data.item.status;
			let price = data.item.price;
			let stock = data.item.stock;
			let modelName = [];

			if (HAVE_VARIATIONS)
				for (let i = 0, m = data.item.models; i < m.length; i++)
					if (m[i].modelid == MODEL_ID) {
						MODEL_KEY = i;
						status = m[i].status;
						price = m[i].price;
						stock = m[i].stock;
						modelName = [`Model: ${m[i].name}`];

						break;
					}

			itemInitPrice = price / 100000;

			info({
				id: ID,
				price: priceFormat(itemInitPrice),
				tags: [
					...modelName,
					`Shop ID: ${SID}`,
					`status: ${status}`,
					`Còn lại: ${stock}`,
					`freeShip: ${data.item.show_free_shipping ? "Có" : "Không"}`,
					`extDay: ${data.item.estimated_days || "Không Rõ"}`
				]
			})

			return data;
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

		let regexResult = /(?:http|https)\:\/\/shopee\.vn\/(?:(?:product\/(\d+)\/(\d+))|(?:.+\.(\d+)\.(\d+)))/gm
			.exec(this.page.url.href);
	
		if (!regexResult) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}

		ID = parseInt(regexResult[2] || regexResult[4]);
		SID = parseInt(regexResult[1] || regexResult[3]);
	
		log(`Item ID: ${ID}`);
		log(`Shop ID: ${SID}`);

		let itemData = await updateItemData();

		await updatePriceHistory(1, ID, SID);
		log("Đã lấy thông tin Item");

		log("Đang chờ cài đặt từ người dùng");
		// Wait for variant settings
		if (itemData.item.models.length > 0) {
			log(" + Tìm thấy biến thể");
			HAVE_VARIATIONS = true;
			let modelList = [];

			for (let model of itemData.item.models)
				modelList.push({ name: model.name, color: "pink", value: model.modelid });

			let modelSelect = await setup({
				itemModel: {
					type: "radio",
					label: "Chọn loại hàng",
					required: true,
					list: modelList
				}
			}, { confirm: "Tiếp" });

			MODEL_ID = parseInt(modelSelect.itemModel);
			log(" + Lựa chọn thiết lập: " + MODEL_ID);
			await delayAsync(500);
			await updateItemData();
		}

		log(" + Đang lấy danh sách Coupon");
		var FREESHIP = null;
		var COUPON = null;

		let vouchersList = await myajax({
			url: `${HOSTADDRESS}/api/v2/voucher_wallet/get_recommend_vouchers`,
			method: "POST",
			header: {
				"X-API-SOURCE": "pc",
				"X-CSRFToken": CSRF,
				"X-Requested-With": "XMLHttpRequest",
				"FH_Origin": HOSTADDRESS,
				"FH_Referer": HOSTADDRESS,
				"FH_Sec-Fetch-Dest": "empty",
				"FH_Sec-Fetch-Mode": "cors",
				"FH_Sec-Fetch-Site": "same-origin",
			},
			json: {
				check_voucher_payment_criteria: false,
				need_wallet_active_info: false,
				orders: JSON.stringify([{
					items: [{
						itemid: ID,
						modelid: MODEL_ID,
						quantity: 1,
						currency: "VND",
						price: itemInitPrice * 10000,
						shopid: SID,
						item_group_id: null,
						add_on_deal_id: null,
						checkout: true
					}],
					shopid: SID
				}]),
			}
		})

		if (!vouchersList.data) {
			rejectSetup(`Không tìm thấy danh sách Mã Giảm Giá! <br><i>(Đảm bảo rằng bạn đã đăng nhập vào <b>Shopee</b>)</i>`);
			return;
		}

		let freeshipCode = [];

		for (let item of vouchersList.data.freeshipping_vouchers)
			if (item.is_applicable)
				freeshipCode.push({
					name: `${item.voucher_code} (từ ${priceFormat(item.min_spend / 10000)}đ)`,
					color: "blue",
					value: item.promotionid
				});

		let freeShipSelect = await setup({
			note: { type: "note", level: (freeshipCode.length === 0) ? "warning" : "okay", text: `Đang hiện <b>${freeshipCode.length}/${vouchersList.data.freeshipping_vouchers.length}</b> mã có thể áp dụng` },
			freeship: {
				type: "radio",
				label: "Chọn mã miễn phí vận chuyển",
				required: false,
				list: freeshipCode
			}
		}, { confirm: "Tiếp" });

		FREESHIP = freeShipSelect.freeship ? parseInt(freeShipSelect.freeship) : null;
		COUPON   = vouchersList.data.valid_vouchers[0]
			? vouchersList.data.valid_vouchers[0].voucher_code
			: "";
		COUPON_DESC = "Không có Mã Giảm Giá nào được đề xuất";

		if (vouchersList.data.valid_vouchers[0]) {
			let _d = vouchersList.data.valid_vouchers[0];
			COUPON_DESC = `MÃ <b style="font-size: 15px">${_d.voucher_code}</b>`;

			COUPON_DESC += `<ul>`;
			COUPON_DESC += `<li>Giảm ${_d.discount_percentage}% đơn tối thiểu ${_d.discount_value / 100000}đ, giảm tối đa ${_d.discount_cap / 100000}</li>`

			for (let i of _d.customised_labels)
				COUPON_DESC += `<li><i>${i.content}</i></li>`;

			COUPON_DESC += `<li>Đã dùng <b>${_d.used_count}</b> lần. Còn ${formatTime(_d.end_time - time())}</li>`;
			COUPON_DESC += `</ul>`;
		}

		log(`    + FREESHIP = ${FREESHIP}`);
		log(`    + COUPON   = ${COUPON}`);
		await delayAsync(1000);
		
		// Wait for main settings
		const settings = await setup({
			priceHistory: { type: "customNode", node: PHC },
			orderByPrice: { type: "switch", label: "Mua theo giá sản phẩm", name: "orderBy", color: "pink", value: true },
            orderByCoupon: { type: "switch", label: "Mua theo mã giảm giá", name: "orderBy" },
			orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, required: true, depend: "orderBy:orderByPrice" },
			orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
			checkInterval: { type: "number", label: "Khoảng kiểm tra", value: 200, required: true },
			couponNote: { type: "note", text: COUPON_DESC },
			coupon: { type: "text", label: "Mã giảm giá (tùy chọn)" },
			useAirPay: { type: "checkbox", label: `Thanh toán bằng AirPay`, color: "blue", value: false, required: true },
			shipping: {
				type: "radio",
				label: "Đơn vị giao hàng",
				required: true,
				list: [
					{ name: `Giao Hàng Tiết Kiệm`, value: 50012, checked: true },
					{ name: `J&T Express`, color: "blue", value: 50018 },
					{ name: `Ninja Van`, color: "blue", value: 50023 },
					{ name: `Giao Hàng Nhanh`, color: "blue", value: 50011 }
				]
			},
			preferredTime: { type: "checkbox", label: `Giao hàng trong giờ hành chính`, color: "blue", value: false, required: true },
			userAgent: { type: "text", label: "User-Agent", value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36" },
			APISource: { type: "text", label: "X-API-Source", value: "pc" }
		});
	
		log("CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		heartbeat();
		run();
		
		// Start
		var CHECKOUT_GET = {};
		var checkNth = 0;
		var start = time();

		//* ======================
		//* DO ORDER MAIN FUNCTION
		//* ======================

		const __addToCart = async ({
			id = 0,
			shopId = 0,
			modelId = null,
			count = 1,
			coupon = "",
			shipping = 50012,
			preferredTime = false,
			APISource = "pc"
		}) => {
			sounds.notification();
			const _mIdObj = (typeof modelId === "number") ? { modelid: modelId } : {}
			
			log("Đang thêm Item vào Giỏ Hàng");
			runInfo({ now: `Bước 1`, end: `Bước 5`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			let addCartData = null;

			try {
				addCartData = await myajax({
					url: `${HOSTADDRESS}/api/v2/cart/add_to_cart`,
					method: "POST",
					header: {
						"X-API-SOURCE": APISource,
						"X-CSRFToken": CSRF,
						"X-Requested-With": "XMLHttpRequest",
						"FH_Origin": HOSTADDRESS,
						"FH_Referer": HOSTADDRESS,
						"FH_Sec-Fetch-Dest": "empty",
						"FH_Sec-Fetch-Mode": "cors",
						"FH_Sec-Fetch-Site": "same-origin",
					},
					json: {
						quantity: count,
						checkout: true,
						update_checkout_only: false,
						donot_add_quantity: true,
						source: `{"refer_urls":[]}`,
						shopid: shopId,
						itemid: id,
						..._mIdObj
					}
				});
			} catch(e) {
				triggerError(e);
				throw e;
			}
	
			if (addCartData.error) {
				await errored("Lỗi Khi Thêm Item Vào Giỏ");
				log(" + Cannot Add Item Into Cart");
				log(`    + Code: ${addCartData.error}`);
				log(`    + MSG : ${addCartData.error_msg || "Không Rõ"}`);
				throw { code: -1, description: addCartData.error_msg, data: addCartData };
			}

			let ordersData = await myajax({
				url: `${HOSTADDRESS}/api/v2/cart/get_orders`,
				method: "GET",
				header: {
					"X-API-SOURCE": APISource,
					"X-CSRFToken": CSRF,
					"X-Requested-With": "XMLHttpRequest"
				}
			})

			for (let i = 0; i < ordersData.data.shoporders.length; i++)
				for (let j = 0; j < ordersData.data.shoporders[i].iteminfos.length; j++)
					ordersData.data.shoporders[i].iteminfos[j].checkout = true;

			log(` + Thêm Item vào Giỏ thành công!`);
			runInfo({ now: `Bước 2`, progress: 20, progWarn: false, checkDetail: "Đang lấy thông tin Item" });
			heartbeat();
			log("Đang lấy thông tin Item");
			let checkoutPayload = {
				cart_type: 0,
				client_id: 0,
				order_update_info: {},
				shoporders: [{
					shop: {
						shopid: shopId
					},
					items: [{
						itemid: id,
						add_on_deal_id: null,
						is_add_on_sub_item: null,
						item_group_id: null,
						quantity: count,
						..._mIdObj
					}],
					logistics: {
						recommended_channelids: null
					},
					buyer_address_data: {}
				}],
				selected_payment_channel_data: {},
				promotion_data: {
					voucher_code: coupon,
					use_coins: false,
					free_shipping_voucher_info: {}
				},
				shipping_orders: [{
					sync: true,
					logistics: {
						recommended_channelids: null
					},
					buyer_address_data: {
						address_type: 0,
						addressid: 15777313
					},
					selected_logistic_channelid: shipping,
					shipping_id: 1,
					shoporder_indexes: [0],
					buyer_ic_number: "",
					selected_preferred_delivery_time_option_id: preferredTime,
					selected_preferred_delivery_instructions: {}
				}],
				device_info: {
					device_id: "",
					device_fingerprint: "",
					tongdun_blackbox: "",
					buyer_payment_info: {}
				},
				tax_info: {
					tax_id: ""
				}
			}

			heartbeat();
			log(" + Fetching /checkout/get");
			CHECKOUT_GET = await myajax({
				url: `${HOSTADDRESS}/api/v2/checkout/get`,
				method: "POST",
				header: {
					"X-API-SOURCE": APISource,
					"X-CSRFToken": CSRF,
					"X-Requested-With": "XMLHttpRequest"
				},
				json: checkoutPayload
			})

			if (CHECKOUT_GET.error) {
				await errored("Lỗi khi tiến hành Lấy Thông Tin item");
				log(" + Errored while checking out Item");
				log(`    + Code: ${CHECKOUT_GET.error}`);
				log(`    + EC  : ${CHECKOUT_GET.error_empty_cart}`);
				log(`    + MSG : ${CHECKOUT_GET.error_msg || "Không Rõ"}`);
				throw { code: -1, description: "Không thể tiến hành Checkout", data: CHECKOUT_GET };
			}
		}

		const __applyCoupon = async ({
			coupon = "",
			freeShip = null,
			APISource = "pc"
		}) => {
			if (coupon !== "" || freeShip !== null) {
				runInfo({ now: `Bước 3`, progress: 40, progWarn: false, checkDetail: "Đang Áp Dụng Mã Giảm Giá" });
				log(`Đang áp dụng Coupon: ${coupon}`);

				heartbeat();
				log(" + Đang lấy danh sách giỏ hàng");
				let ordersData = await myajax({
					url: `${HOSTADDRESS}/api/v2/cart/get_orders`,
					method: "GET",
					header: {
						"X-API-SOURCE": APISource,
						"X-CSRFToken": CSRF,
						"X-Requested-With": "XMLHttpRequest"
					}
				})

				for (let i = 0; i < ordersData.data.shoporders.length; i++)
					for (let j = 0; j < ordersData.data.shoporders[i].iteminfos.length; j++)
						ordersData.data.shoporders[i].iteminfos[j].checkout = true;

				heartbeat();
				log(" + Đang áp dụng Coupon");
				let response = await myajax({
					url: `${HOSTADDRESS}/api/v2/checkout/coupon`,
					method: "POST",
					header: {
						"X-API-SOURCE": APISource,
						"X-CSRFToken": CSRF,
						"X-Requested-With": "XMLHttpRequest"
					},
					json: {
						promotion_data: {
							auto_apply_vouchers: false,
							free_shipping_voucher_info: {
								free_shipping_voucher_id: freeShip
							},
							use_coins: false,
							voucher_code: coupon
						},

						shoporders: ordersData.data.shoporders
					}
				})

				if (response.error !== 0) {
					log("    + Không thể áp dụng Coupon");
					log(`      + Code: ${response.error}`);
					log(`      + MSG : ${response.error_msg || "Không rõ"}`);
					log(`      + Bỏ qua lỗi: true`);
				} else
					log(`    + Đã áp dụng thành công: ${response.applied_voucher_code}`);
			}
		}
		
		const __doOrder = async ({
			APISource = "pc"
		}) => {
			runInfo({ now: `Bước 4`, progress: 60, progWarn: false, checkDetail: "Đang chọn phương thức thanh toán" });
			heartbeat();
			log("Đang chọn phương thức thanh toán")
			log(` + Sử dụng AirPay: ${settings.useAirPay}`);

			CHECKOUT_GET.selected_payment_channel_data = settings.useAirPay
				? {
					channel_id: 5001800,
					channel_item_option_info: {},
					version: 2,
				}
				: {
					payment_channelid: 59000,
					version: 1
				}

			runInfo({ now: `Bước 5`, progress: 80, progWarn: false, checkDetail: "Đang đặt hàng" });
			heartbeat();
			log(`Bắt đầu đặt hàng`);

			CHECKOUT_GET.headers = {}
			CHECKOUT_GET.timestamp = Math.floor(time()) + 2;
			CHECKOUT_GET.shipping_orders[0].buyer_ic_number = "";
			CHECKOUT_GET.shoporders[0].buyer_ic_number = "";
			CHECKOUT_GET.shoporders[0].ext_ad_info_mappings = []
			delete CHECKOUT_GET.payment_channel_info;
			delete CHECKOUT_GET.shipping_orders[0].logistics;
			delete CHECKOUT_GET.shoporders[0].logistics;

			log(` + Đang mã hóa dữ liệu`);
			let HASH = randString(128, "0123456789abcdef");
			let placeOrder = "";

			try {
				placeOrder = await myajax({
					url: `${HOSTADDRESS}/api/v2/checkout/place_order`,
					method: "POST",
					type: "text",
					header: {
						"Content-Type": "text/plain;charset=UTF-8",
						"FH_User-Agent": settings.userAgent,
						"x-api-source": APISource,
						"x-csrftoken": CSRF,
						"x-cv-id": 102,
						"x-track-id": HASH,
						"x-shopee-language": "vi",
						"FH_Origin": HOSTADDRESS,
						"FH_Referer": `${HOSTADDRESS}/bridge_cmd?cmd=` + craftURL("reactPath", {
							tab: "buy",
							path: craftURL("shopee/OPC_HOME", {
								promotionData: "[object Object]",
								shopOrders: "[object Object]",
								source: "RN_CART"
							})
						}),
						"FH_Host": "shopee.vn",
						"FH_Sec-Fetch-Dest": "empty",
						"FH_Sec-Fetch-Mode": "cors",
						"FH_Sec-Fetch-Site": "same-origin",
						"If-None-Match-": `*`,
					},
					raw: encrypt(JSON.stringify(CHECKOUT_GET), HASH)
				})
			} catch(e) {
				log(" + Request Errored");
				log(`    + Code: ${e.data.code}`);
				log(`    + MSG : ${e.data.description || "Không rõ"}`);
				placeOrder = e.data.data;
			}

			log(` + Đang giải mã dữ liệu`);
			let decrypted = ""

			try {
				decrypted = decrypt(placeOrder, HASH);
			} catch(e) {
				await errored("Lỗi Khi Tiến Hành Giải Mã Dữ Liệu");
				log(" + Cannot Decrypt Data");
				log(`    + Code: ${e.code}`);
				log(`    + MSG : ${e.description || "Không rõ"}`);
				log(`    + CS  : ${e.data}`);
				throw { code: e.code, description: `Lỗi Khi Tiến Hành Giải Mã Dữ Liệu`, data: e };
			}

			try {
				placeOrder = JSON.parse(decrypted);
				clog("DEBG", "Decrypted Data:", placeOrder);
			} catch(e) {
				await errored("Lỗi Khi Tiến Hành Giải Mã Dữ Liệu");
				log(" + Cannot Parse Decrypted Data");
				log(`    + Decrypted : ${decrypted || "Không rõ"}`);
				throw { code: -1, description: `Cannot Parse Decrypted Data`, data: decrypted };
			}

			if (placeOrder.error && placeOrder.error !== 0) {
				await errored("Lỗi Khi Tiến Hành Đặt Mua Item");
				log(" + Cannot Place Order");
				log(`    + Code: ${placeOrder.error}`);
				log(`    + MSG : ${placeOrder.error_msg || "Không rõ"}`);
				throw { code: placeOrder.error, description: `Lỗi Khi Tiến Hành Đặt Mua Item`, data: placeOrder };
			}

			runInfo({ progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công" });
			heartbeat();
			log(" + doOrder đã hoàn thành! Đang chuyển tới chi tiết đơn...");
			log("=========== KẾT QUẢ ===========");
			log(` + CheckoutID  : ${placeOrder.checkoutid}`);
			log(` + paymentType : ${placeOrder.payment_type}`);
			log(` + Order ID    : ${placeOrder.orderids.join(", ")}`);

			command("changeLocation", { href: placeOrder.redirect_url });
		}

		//* ========
		//*   MAIN
		//* ========

		switch (settings.orderBy) {

			//! |==========================|
			//! |   Order By Coupon Check  |
			//! |==========================|

			case "orderByCoupon":
				runInfo({
					end: settings.checkInterval + "ms",
					target: settings.orderPrice
				});

				if (settings.coupon == "") {
					rejectSetup("Mã Giảm Giá không được để trống");
					return;
				}

				sounds.notification();
				await __addToCart({
					id: ID,
					shopId: SID,
					modelId: MODEL_ID,
					count: settings.orderCount,
					coupon: settings.coupon,
					shipping: settings.shipping,
					preferredTime: settings.preferredTime,
					APISource: settings.APISource
				});

				runInfo({ now: `Bước 3`, progress: 40, progWarn: false, checkDetail: "Đang Lấy Thông Tin Giỏ Hàng" });

				heartbeat();
				log(" + Đang lấy danh sách giỏ hàng");
				var ordersData = await myajax({
					url: `${HOSTADDRESS}/api/v2/cart/get_orders`,
					method: "GET",
					header: {
						"X-API-SOURCE": settings.APISource,
						"X-CSRFToken": CSRF,
						"X-Requested-With": "XMLHttpRequest"
					}
				})

				for (let i = 0; i < ordersData.data.shoporders.length; i++)
					for (let j = 0; j < ordersData.data.shoporders[i].iteminfos.length; j++)
						ordersData.data.shoporders[i].iteminfos[j].checkout = true;

				var checker = async () => {
					checkNth++;
			
                    let reqStart = time();
                    let info = {}

					try {
						info = await myajax({
							url: `${HOSTADDRESS}/api/v2/checkout/coupon`,
							method: "POST",
							header: {
								"X-API-SOURCE": settings.APISource,
								"X-CSRFToken": CSRF,
								"X-Requested-With": "XMLHttpRequest"
							},
							json: {
								promotion_data: {
									auto_apply_vouchers: false,
									free_shipping_voucher_info: {
										free_shipping_voucher_id: FREESHIP
									},
									use_coins: false,
									voucher_code: settings.coupon
								},
		
								shoporders: ordersData.data.shoporders
							}
						})
					} catch(e) {
						heartbeat({ color: "red" });
						log(" + Lỗi đã xảy ra khi áp dụng Coupon");
						log(`    + Code: ${e.code}`);
						log(`    + MSG : ${e.description || "Không Rõ"}`);
						log(`    + Bỏ qua lỗi: true`);

						let reqTime = ((time() - reqStart) * 1000);
						let reqTimeAT = (reqTime / settings.checkInterval) * 100;
						runInfo({
							progress: reqTimeAT,
                            now: reqTime.toFixed(2) + "ms",
                            end: settings.checkInterval + "ms",
							itemStatus: "LỖI ĐÃ XẢY RA",
							itemStatusColor: "red",
							checkDetail: "Một lỗi đã xảy ra trong quá trình áp dụng Coupon"
						});

						return;
					}
			
					let reqTime = ((time() - reqStart) * 1000);
                    let reqTimeAT = (reqTime / settings.checkInterval) * 100;
                    var currentPrice = info.total_payment[0] / 100000;
			
					runInfo({
						progress: reqTimeAT,
                        now: reqTime.toFixed(2) + "ms",
                        end: settings.checkInterval + "ms",
						current: currentPrice ? currentPrice : "Không Rõ",
						saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
						itemStatus: `${settings.coupon}: ${(info.invalid_message_code === 0) ? "Mã Hợp Lệ" : info.invalid_message_reason}`,
						itemStatusColor: (info.invalid_message_code === 0) ? "green" : "yellow",
						checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
					})

					heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

					if (typeof currentPrice === "number" && (info.invalid_message_code === 0)) {
						log(`ACP> ${settings.coupon}: ${info.voucher_info.error || "Mã Hợp Lệ"}`);
						let orderTimer = new stopClock();
						doCheck = false;
						
						order();
						sounds.notification();
						await __doOrder({
							APISource: settings.APISource
						});
						
						log(` + Thời gian   : ${orderTimer.stop}s`);
						complete();
						runInfo({
							itemStatus: `Đặt thành công ${settings.orderCount} items`,
							itemStatusColor: "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Đặt hàng thành công"
						});

						await sendBeacon({
							script: SCRIPT.id,
							name: itemName,
							link: `${HOSTADDRESS}/item-i.${SID}.${ID}`,
							price: currentPrice,
							count: settings.orderCount,
							runPrice: itemInitPrice,
							oldPrice: ordersData.data.shoporders[0].iteminfos[0].oldprice,
							thumbnail: `https://cf.shopee.vn/file/${ordersData.data.shoporders[0].iteminfos[0].image}`
						});

						log("CHẠY KẾT THÚC");

						delete orderTimer;
                    }
                    
                    // UNLOAD MEMORY
                    delete info;
                    delete reqStart;
                    delete currentPrice;
                    delete reqTime;
                    delete reqTimeAT;
				}

				break;

			//! |==========================|
			//! |      Order By Price      |
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
						data = await myajax({
							url: `${HOSTADDRESS}/api/v2/item/get`,
							method: "GET",
							query: {
								itemid: ID,
								shopid: SID
							}
						});
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

						// UNLOAD MEMORY
						delete reqTime;
						delete reqTimeAT;
						return;
					}

					let price = data.item.price;
					let stock = data.item.stock;

					if (HAVE_VARIATIONS) {
						let i = data.item.models[MODEL_KEY];
						price = i.price;
						stock = i.stock;
					}
			
					var currentPrice = data.item ? price / 100000 : null;
					let reqTime = ((time() - reqStart) * 1000);
					let reqTimeAT = (reqTime / settings.checkInterval) * 100;
			
					runInfo({
						progress: reqTimeAT,
						now: reqTime.toFixed(2) + "ms",
						current: currentPrice ? currentPrice : "Không Rõ",
						saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
						itemStatus: (stock > 0) ? `CÓ HÀNG (${stock})` : `KHÔNG CÒN HÀNG (${stock})`,
						itemStatusColor: (stock > 0) ? "green" : "red",
						checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
					})

					heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

					if (typeof currentPrice === "number" && currentPrice < settings.orderPrice && stock > 0) {
						log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
						let orderTimer = new stopClock();

						doCheck = false;
						order();
						sounds.notification();

						await __addToCart({
							id: ID,
							shopId: SID,
							modelId: MODEL_ID,
							count: settings.orderCount,
							coupon: settings.coupon,
							APISource: settings.APISource
						});

						await __applyCoupon({
							coupon: settings.coupon,
							freeShip: FREESHIP,
							APISource: settings.APISource
						});

						await __doOrder({
							APISource: settings.APISource
						});
						
						log(` + Thời gian   : ${orderTimer.stop}s`);
						complete();
						runInfo({
							itemStatus: `Đặt thành công ${settings.orderCount} items`,
							itemStatusColor: "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Đặt hàng thành công"
						});

						await sendBeacon({
							script: SCRIPT.id,
							name: itemName,
							link: `${HOSTADDRESS}/item-i.${SID}.${ID}`,
							price: currentPrice,
							count: settings.orderCount,
							runPrice: itemInitPrice,
							oldPrice: data.item.price_before_discount,
							thumbnail: `https://cf.shopee.vn/file/${data.item.image}`
						});

						log("CHẠY KẾT THÚC");

						delete orderTimer;
						return;
					}

					// UNLOAD MEMORY
					delete reqStart;
					delete data;
					delete price;
					delete stock;
					delete currentPrice;
					delete reqTime;
					delete reqTimeAT;
				}

				break;
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
	
		__checkHandler();
		log("Bắt đầu kiểm tra giá");
	} catch(e) {
		triggerError(e);
		return;
	}
})()