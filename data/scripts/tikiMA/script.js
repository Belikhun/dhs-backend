// Script begin here
(async () => {
	let infoUpdateInterval = null;
	let doCheck = true;

	const HOSTADDRESS = "https://tiki.vn";

	onCancel((stop) => {
		if (stop)
			this.subScreen.hide();

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
		let itemName = "";
	
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
		
		//? PRICE HISTORY CONTAINER
		let PHC = document.createElement("div");
		PHC.classList.add("priceHistory");
		//? PH Title
		let PHTitle = document.createElement("t");
		PHTitle.classList.add("title");
		PHTitle.innerText = "Thông Tin Giá";
		//? PH Chart
		let PHChart = document.createElement("div");
		PHChart.classList.add("chart");
		const PHChartBarMin = 30;
		const PHChartBarMax = 100;
		//? PH Info
		let PHInfo = document.createElement("div");
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
			let PHChartDeltaTime = document.createElement("span");
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
			let PHChartAvgLine = document.createElement("span");
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
		let prevAccountList = (await this.dataLoad("tikiMA.accountList")) || "";

		// Wait for Account List
		const account = await setup({
			note: { type: "note", level: "info", text: "Mỗi tài khoản một dòng, ngăn cách tên tài khoản và mật khẩu bằng <b>:</b> (ex: \"username:password\")" },
			list: { type: "textarea", label: "Danh sách tài khoản", height: "180px", value: prevAccountList, required: true, save: false }
		}, { confirm: "Tiếp", saveKey: "accountSetup" });

		log("👥 Đang lưu danh sách tài khoản");
		await this.dataSave({ "tikiMA.accountList": account.list });
		let accountList = account.list
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
			coupon: { type: "textarea", height: "100px", label: "Mã giảm giá (tùy chọn)" },
			couponApplyAll: { type: "checkbox", label: "Áp dụng mã giảm giá cho toàn bộ đơn hàng", color: "blue", value: false },
			paymentMethod: {
				type: "radio",
				label: "Phương Thức Thanh Toán",
				required: true,
				list: [
					{ name: `Thanh Toán Khi Nhận Hàng`, color: "pink", value: "cod", checked: true },
					{ name: `Ví Momo`, color: "blue", value: "momo" },
					{ name: `Zalo Pay`, color: "blue", value: "zalopay" }
				]
			},
			autoReOrder: { type: "checkbox", label: "Tự động mua lại cho tài khoản", color: "blue", value: false, save: false },
			autoReOrderTimes: { type: "number", label: "Số lần tự động mua lại CHO MỐI TÀI KHOẢN", value: 2, depend: "autoReOrder" },
			continueRun: { type: "checkbox", label: "Tiếp tục chạy khi chưa mua đủ số lượng", color: "pink", depend: "autoReOrder" },
			proxy: { type: "checkbox", label: "Sử dụng Proxy", value: false },
			xPlatform: { type: "text", label: "X-Platform", value: "frontend-desktop" }
		});

		if (settings.proxy && !proxy.allowed) {
			rejectSetup("Bạn không có quyền sử dụng Proxy!");
			return;
		}

		if (settings.proxy && Object.keys(proxy.list).length === 0) {
			rejectSetup("Không tìm thấy Proxy nào cả!");
			return;
		}

		settings.coupon = settings.coupon.split("\n").filter(String);

		let container = null;
		if (["zalopay", "momo"].includes(settings.paymentMethod)) {
			container = buildElementTree("div", [], [
				{ type: "div", class: "header", name: "header", list: [
					{ type: "t", class: "left", name: "left", text: `Danh Sách QR Code Cho ${{ momo: "Ví Momo", zalopay: "Ví ZaloPay" }[settings.paymentMethod]}` }
				]},
				{ type: "div", class: "list", name: "list" }
			]).obj;
			
			this.subScreen.show(container, "QRCodeList");
		}

		const addQR = ({
			name,
			price,
			qr
		} = {}) => {
			if (!container)
				return;

			let item = buildElementTree("span", "item", [
				{ name: "qr", node: new lazyload({ source: qr, classes: "qr" }) },
				{ type: "div", class: "detail", name: "detail", list: [
					{ type: "t", class: "title", name: "titleNode", text: name },
					{ type: "t", class: "price", name: "price", text: priceFormat(price) },
					{ type: "span", class: "complete", name: "complete" }
				]}
			]);

			item.obj.detail.complete.addEventListener("click", () => container.list.removeChild(item.tree));
			container.list.appendChild(item.tree);
		}
	
		log("CÀI ĐẶT:");
		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		accountList = accountList.map(i => { i.c = (settings.autoReOrder) ? settings.autoReOrderTimes : 1; return i });
		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		let checkNth = 0;
		let start = time();
		let successCount = 0;
		let couponApplied = false;
	
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
	
			let currentPrice = data ? data.price : null;
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

				let totalOrderTimes = (settings.autoReOrder)
					? accountList.length * settings.autoReOrderTimes
					: accountList.length;

				if (settings.proxy) {
					let promises = []
					let threadProgress = []

					for (let orderNth = 0; orderNth < accountList.length; orderNth++) {
						let account = accountList[orderNth];

						if (account.c <= 0) {
							log(`🏳 Đã mua đủ số lượng cho tài khoản ${account.u}`);

							return;
						}

						for (let time = 1; time <= account.c; time++)
							promises.push(new Promise(async (resolve, reject) => {
								let token = null;
								let threadNum = orderNth + (time - 1);
		
								let server = proxy.assign();
								let jarID = randString(16);
								let bar = subBar({ progress: 0 });
								let logs = logGroup(`[THREAD ${threadNum}]: ${account.u} (${time}) using ${server}`);
								logs.setColor(oscColor("yellow"));
		
								// Overwrite Global Function
								let info = ({ progress = null }) => {
									if (progress) {
										bar.set({ progress });

										threadProgress[orderNth] = progress;
		
										runInfo({
											progress: threadProgress.reduce((t, n) => t + n, 0) / threadProgress.length,
											progWarn: false,
											now: successCount,
											end: totalOrderTimes
										});
									}
								}

								let __clog = window.clog;
								let clog = (level, ...args) => {
									args = [{
										text: SCRIPT.id,
										color: flatc("green"),
										padding: 6,
										separate: true
									}, {
										color: flatc("pink"),
										text: server,
										padding: 14,
										separate: true
									}, ...args]

									__clog(level, ...args);
								}

								let log = (text) => {
									clog("INFO", text);
									logs.write(text);
								}

								let panic = (message) => {
									heartbeat({ color: "red", beat: false });
									logs.setColor(oscColor("red"));
									sounds.warning();
									
									log("============= LỖI! =============");
									log(message);
									writeLog(`THREAD ${threadNum} đã xảy ra lỗi!`);
									reject({ code: -1, description: message });
				
									bar.set({ color: "red" });
								}

								let myajax = async ({
									url = "/",
									method = "GET",
									query = {},
									form = {},
									json,
									header = {},
									force = false,
									changeState = true,
									reRequest = true,
									withCredentials = false,
									timeout = 0
								}) => {
									let response = await proxy.request({
										server,
										url,
										method,
										query,
										form: json || form,
										formType: (json) ? "json" : "data",
										header,
										jarID,
										force,
										changeState,
										reRequest,
										withCredentials,
										timeout
									});
									
									return response.data;
								}

								//* =============== MAIN LOGIC ================
								log(`🛰 ${server}`);
								log(`🛢 ${jarID}`);
		
								heartbeat();
								log(`👤 ACCOUNT ${account.u} (${orderNth + 1}/${accountList.length})`);
								log(`🔃 Số lần mua: ${account.c}`);
		
								try {
									token = await __switchAccount({
										username: account.u,
										password: account.p,

										info,
										log,
										clog,
										panic,
										myajax
									});
									
									sounds.notification();

									let orderData = await __doOrder({
										id: PID,
										count: settings.orderCount,
										token: token.token,
										paymentMethod: settings.paymentMethod,
										shippingAddress: account.a,
										platform: settings.xPlatform,
										coupon: (!couponApplied || settings.couponApplyAll)
											? settings.coupon
											: null,

										info,
										log,
										clog,
										panic,
										myajax
									});

									addQR({
										name: `ID:${orderData.id} C:${orderData.coupon || "NONE"} M:${orderData.method} S:${orderData.shipping}`,
										price: orderData.grandTotal,
										qr: orderData.QRCode
									});
		
									successCount++;
									orderedCount++;
									accountList[orderNth].c--;
								} catch(e) {
									heartbeat({ color: "red" });
									logs.setColor(oscColor("red"));
									bar.set({ color: "red" });

									log(`👤 Mua thất bại cho ${account.u}! (${orderNth + 1}Nth)\nVui lòng xem Console để biết thêm thông tin lỗi!`);
									clog("ERRR", `doOrder ${account.u} [${PID}]`, e);
									reject(e);

									if (token)
										await __clearCart({
											token: token.token,

											info,
											log,
											clog,
											panic,
											myajax
										});

									return;
								}
			
								heartbeat();
								log(`👤 Mua thành công cho ${account.u}! (${orderNth + 1}Nth)`);

								logs.setColor(oscColor("green"));
								info({ progress: 100 })
								resolve();
							}));
					}

					await Promise.all(promises);
				} else {
					for (let orderNth = 0; orderNth < accountList.length; orderNth++) {
						let account = accountList[orderNth];
						let token = null;
	
						if (account.c <= 0) {
							log(`🏳 Đã mua đủ số lượng cho tài khoản ${account.u}`);
							continue;
						}
	
						runInfo({ itemStatus: `Lần Mua ${orderNth + 1}/${accountList.length}`, itemStatusColor: "yellow" });
						heartbeat();
						log(`👤 ACCOUNT ${account.u} (${orderNth + 1}/${accountList.length})`);
						log(`🔃 Số lần mua: ${account.c}`);
	
						try {
							token = await __switchAccount({
								username: account.u,
								password: account.p
							});
	
							for (let time = 1; time <= account.c; time++) {
								log(`---------- LẦN ${time}/${account.c} ----------`);
								sounds.notification();
								let orderData = await __doOrder({
									id: PID,
									count: settings.orderCount,
									token: token.token,
									paymentMethod: settings.paymentMethod,
									shippingAddress: account.a,
									coupon: (!couponApplied || settings.couponApplyAll)
										? settings.coupon
										: null,
								});

								addQR({
									name: `ID:${orderData.id} C:${orderData.coupon || "NONE"} M:${orderData.method} S:${orderData.shipping}`,
									price: orderData.grandTotal,
									qr: orderData.QRCode
								});
	
								successCount++;
								orderedCount++;
								accountList[orderNth].c--;
							}
						} catch(e) {
							heartbeat({ color: "red" });
							log(`👤 Mua thất bại cho ${account.u}! (${orderNth + 1}Nth)`);
							clog("ERRR", `doOrder ${account.u} [${PID}]`, e);

							if (token)
								await __clearCart({ token: token.token });

							continue;
						}
	
						heartbeat();
						log(`👤 Mua thành công cho ${account.u}! (${orderNth + 1}Nth)`);
					}
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

				if (successCount < totalOrderTimes && settings.continueRun) {
					log("🛒 Chưa mua đủ số lượng. TIẾP TỤC CHẠY");
					log(` + ĐÃ MUA ${successCount}/${totalOrderTimes}. Còn ${totalOrderTimes - successCount}`);
					doCheck = true;
					return;
				}
	
				complete();
				runInfo({
					itemStatus: `ĐÃ ĐẶT ${successCount} items`,
					itemStatusColor: (successCount === totalOrderTimes ? "green" : "yellow"),
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
	
		__checkHandler();
		log("Bắt đầu kiểm tra giá");
	} catch(e) {
		triggerError(e);
		return;
	}
})()