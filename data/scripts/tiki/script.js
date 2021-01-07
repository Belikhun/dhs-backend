// Script begin here
(async () => {
	let infoUpdateInterval = null;
	let doCheck = true;

	onCancel(() => {
		clearInterval(infoUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`|       Tiki Auto Buy       |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 02:28:23 26/08/2020  |`);
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

		if (!urlRe || !urlRe[1]) {
			rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
			return;
		}

		ID = parseInt(urlRe[1]);
		
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
			autoReOrderNote: { type: "note", level: "warning", text: "Chức năng tự động mua lại sẽ không hoạt động như mong muốn do Tiki chỉ cho phép đặt 1 đơn hàng mỗi 30s" },
			autoReOrder: { type: "checkbox", label: "Tự động mua lại", color: "blue", value: false, save: false, depend: "orderBy:orderByPrice" },
			autoReOrderTimes: { type: "number", label: "Số lần tự động mua lại", value: 2, depend: "autoReOrder" },
			continueRun: { type: "checkbox", label: "Tiếp tục chạy khi chưa mua đủ số lượng", color: "pink", depend: "autoReOrder" },
			xPlatform: { type: "text", label: "X-Platform", value: "frontend-desktop" }
		});
	
		log("⚙ CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
		// Start
		let checkNth = 0;
		let start = time();
		let successCount = 0;
		let __checkHandler = null;
	
		switch (settings.orderBy) {
			//! |==========================|
			//! |   Order By Price Check   |
			//! |==========================|
			case "orderByPrice": {
				runInfo({
					end: settings.checkInterval + "ms",
					target: settings.orderPrice
				});
			
				let checker = async () => {
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
			
						if (settings.autoReOrder)
							for (let orderNth = successCount; orderNth <= settings.autoReOrderTimes; orderNth++) {
								runInfo({ itemStatus: `Lần Mua ${orderNth}/${settings.autoReOrderTimes}`, itemStatusColor: "yellow" });
								heartbeat();
								log(`========== ITEM ${orderNth}/${settings.autoReOrderTimes} ==========`);

								if (orderNth % settings.reCheckPrice === 0) {
									log("💸 Đang kiểm tra giá hiện tại");
									heartbeat({ color: "yellow" });
									let _cp = {};

									try {
										_cp = await fetchItemData(false);

										runInfo({
											current: _cp.price,
											saved: ((_cp.price - itemInitPrice) / itemInitPrice) * 100,
										});
									} catch(e) {
										log("⚠ Lấy thông tin thất bại");
										log(` + Bỏ qua lỗi: true`);
									} finally {
										if (_cp.price >= settings.orderPrice) {
											await errored(`Giá đã thay đổi`);
											log("💸 Giá đã bị thay đổi");
											log(` + NP  : ${priceFormat(_cp.price)}`);
											log(` + Đang dừng chạy`);
											break;
										}

										log(`💸 Giá chưa thay đổi. Tiếp tục chạy`);
									}
								}

								try {
									await __doOrder({
										id: PID,
										count: settings.orderCount,
										paymentMethod: settings.paymentMethod,
										token: await getToken()
									});

									successCount++;
									orderedCount++;
								} catch(e) {
									continue;
								}

								heartbeat();
								log(`🛒 Mua thành công item thứ ${orderNth}!`);
							}
						else {
							await __doOrder({
								id: PID,
								count: settings.orderCount,
								coupon: settings.coupon,
								paymentMethod: settings.paymentMethod,
								token: await getToken()
							});

							successCount++;
							orderedCount++;
						}

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
								`METHOD    : ${settings.orderBy}`,
								...beaconNote
							].join("\n")
						});

						if (successCount < settings.autoReOrderTimes && settings.continueRun) {
							log("🛒 Chưa mua đủ số lượng. TIẾP TỤC CHẠY");
							log(` + ĐÃ MUA ${successCount}/${settings.autoReOrderTimes}. Còn ${settings.autoReOrderTimes - successCount}`);
							doCheck = true;
							return;
						}
			
						complete();
						runInfo({
							itemStatus: `ĐÃ ĐẶT ${settings.autoReOrder ? successCount : settings.orderCount} items`,
							itemStatusColor: settings.autoReOrder ? (successCount === settings.autoReOrderTimes ? "green" : "yellow") : "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Chạy Kết Thúc"
						});

						await command("changeLocation", { href: `${HOSTADDRESS}/sales/order/history` });
						log("CHẠY KẾT THÚC");
						return;
					}
				}
			
				__checkHandler = async () => {
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
			//! |   Order By Coupon Check  |
			//! |==========================|
			case "orderByCoupon": {
				runInfo({
					end: settings.checkInterval + "ms",
					target: settings.orderPrice
				});
			
				let checker = async () => {
					checkNth++;
			
					let reqStart = time();
					let currentPrice = null;

					try {
						await myajax({
							url: `${HOSTADDRESS}/api/v2/carts/mine/coupons/${settings.coupon}`,
							method: "PUT",
							header: {
								"X-Access-Token": await getToken()
							}
						});

						let cartData = await myajax({
							url: `${HOSTADDRESS}/api/v2/carts/mine`,
							query: {
								include: `price_summary`
							},
							header: {
								"X-Access-Token": await getToken()
							}
						})
	
						currentPrice = cartData.grand_total;
					} catch(e) {
						heartbeat({ color: "red" });
						let reqTime = ((time() - reqStart) * 1000);
						let reqTimeAT = (reqTime / settings.checkInterval) * 100;
						
						runInfo({
							progress: reqTimeAT,
							now: reqTime.toFixed(2) + "ms",
							itemStatus: settings.coupon,
							itemStatusColor: "red",
							checkDetail: e.description || (e.data && e.data.error) ? e.data.error.message : "Không Rõ"
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
						itemStatusColor: "green",
						checkDetail: `Bắt đầu đặt mua`
					})

					heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

					if (true) {
						log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
						doCheck = false;
						order();

						await __doOrder({
							itemInit: false,
							token: await getToken()
						});

						complete();
						runInfo({
							itemStatus: `ĐÃ ĐẶT ${settings.orderCount} items`,
							itemStatusColor: "green",
							progress: 100,
							progWarn: false,
							checkDetail: "Đặt hàng thành công"
						});

						await command("changeLocation", { href: HOSTADDRESS + "/sales/order/history" });

						await sendBeacon({
							script: SCRIPT.id,
							name: itemName,
							link: `${HOSTADDRESS}/item-p${ID}.html`,
							price: currentPrice,
							count: settings.orderCount,
							runPrice: itemInitPrice,
							oldPrice: itemData.list_price,
							thumbnail: itemData.thumbnail_url,
							note: [
								`ID        : ${ID}`,
								`CFID      : ${CFID}`,
								`PID       : ${PID}`,
								`METHOD    : ${settings.orderBy}`,
								...beaconNote
							].join("\n")
						});

						log("CHẠY KẾT THÚC");
						return;
					}
				}
			
				__checkHandler = async () => {
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
		}

		//? =============================================================
		//?                      Order By Coupon Init
	
		if (settings.orderBy === "orderByCoupon") {
			runInfo({ now: `Bước 1`, end: `Bước 1`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
			heartbeat();
			await addIntoCart({ id: PID, count: settings.orderCount, token: await getToken() });
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