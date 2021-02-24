// Script begin here
(async () => {
	let infoUpdateInterval = null;
	let isRunning = true;

	onCancel(() => {
		clearInterval(infoUpdateInterval);
		isRunning = false;
	});

	const log = (text) => writeLog(text);

	log(`|===========================|`);
	log(`|      Tiki Order4Ship      |`);
	log(`|          Belikhun         |`);
	log(`|  LU: 23:06:11 24/02/2021  |`);
	log(`|===========================|`);

	let itemList = []
	let accountList = []
	await info({ hide: true });

	// Wait for settings
	const settings = await setup({
		orderCount: { type: "number", label: "Số lượng", value: 1, required: true },
		orderTimeMin: { type: "number", label: "Thời gian mua (nhỏ nhất)", value: 1, required: true },
		orderTimeMax: { type: "number", label: "Thời gian mua (lớn nhất)", value: 10, required: true },
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
		itemList: { type: "textarea", label: "Danh sách mặt hàng", height: "300px", required: true },
		accountList: { type: "textarea", label: "Danh sách tài khoản", height: "300px", required: true },
		itemSelect: {
			type: "radio",
			label: "Phương Thức Chọn Mặt Hàng",
			required: true,
			list: [
				{ name: `Lần Lượt`, color: "pink", value: "normal", checked: true },
				{ name: `Ngẫu Nhiên`, color: "blue", value: "random" }
			]
		},
		proxy: { type: "checkbox", label: "Sử dụng Proxy", value: true, disabled: true },
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

	itemList = settings.itemList.split("\n");
	accountList = accountList = settings.accountList
		.split("\n")
		.filter(String)
		.map(a => { let i = a.split(":"); let c = i[1].split("@"); return { u: i[0], p: c[0], a: c[1] ? parseInt(c[1]) : null } });

	// Process Item List
	log("🍄 Danh sách mặt hàng:");
	for (let i = 0; i < itemList.length; i++) {
		let res = /(?!http|https)\:\/\/tiki\.vn\/.+\-p(\d+)\.html\?spid=(\d+)/gm.exec(itemList[i]);
		
		if (!res) {
			rejectSetup(`Link thứ <b>${i + 1}</b> không hợp lệ:<br><pre>${itemList[i]}</pre>`);
			return;
		}

		itemList[i] = { id: res[1], sid: res[2] }
		log(` + ID: ${res[1]} SID: ${res[2]}`);
	}

	run();
	let start = time();
	let promises = []
	let threadProgress = []
	let ordering = 0;

	infoUpdateInterval = setInterval(() => {
		let runTime = time() - start;
		runInfo({ time: runTime, dataType: "time" });
	}, 60);

	for (let threadNum = 0; threadNum < accountList.length; threadNum++) {
		let account = accountList[threadNum];

		promises.push(new Promise(async (resolve) => {
			let fails = 0;
			let itemPos = -1;
			let server = null;
			let jarID = null;
			let bar = subBar({ progress: 0 });
			let logs = logGroup(`[THREAD ${threadNum}]`);
			logs.setColor(oscColor("blue"));

			// Overwrite Global Function
			let info = ({ progress } = {}) => {
				if (progress) {
					bar.set({ progress });
					threadProgress[threadNum] = progress;
					let p = threadProgress.reduce((t, n) => t + n, 0) / threadProgress.length;

					logs.setTitle(`[THREAD ${threadNum}]: Using ${server}: ${account.u} (${fails} fails)`);
					logs.setColor(oscColor(fails > 0 ? "yellow" : "blue"));

					runInfo({
						progress: p,
						progWarn: false,
						now: p.toFixed(0),
						end: 100,
						current: "ORDERING",
						target: ordering,
						itemStatus: `${threadProgress.length} THREADS`,
						itemStatusColor: "green",
						checkDetail: `Đang Chạy`,
						dataType: "time"
					});
				}
			}

			let panic = (message) => {
				sounds.warning();
				heartbeat({ color: "red", beat: false });
				throw { code: -1, description: message }
			}
			
			let __clog = window.clog;
			let clog = (level, ...args) => {
				args = [{
					text: SCRIPT.id,
					color: flatc("green"),
					padding: 6,
					seperate: true
				}, {
					color: flatc("pink"),
					text: server,
					padding: 14,
					seperate: true
				}, ...args]

				__clog(level, ...args);
			}

			let log = (text) => {
				clog("INFO", text);
				logs.write(text);
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
				try {
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
				} catch(e) {
					throw e.data || e;
				}
			}

			while (isRunning) {
				try {
					server = proxy.assign();
					jarID = randString(16);
		
					//* =============== MAIN LOGIC ================
					log(`🛰 ${server}`);
					log(`🛢 ${jarID}`);
					logs.setTitle(`[THREAD ${threadNum}] Using ${server}: ${account.u}`);

					// Select item
					let selectedItem = null;
					switch (settings.itemSelect) {
						case "normal":
							itemPos++;

							if (itemPos >= itemList.length - 1)
								itemPos = itemList.length - 1;

							selectedItem = itemList[itemPos]
							break;
					
						case "random":
							selectedItem = itemList[randBetween(0, itemList.length - 1)]
							break;

						default:
							throw { code: -1, description: `Unknown itemSelect: ${settings.itemSelect}` }
					}

					log(`🧃 ID: ${selectedItem.id} SID: ${selectedItem.sid}`);
	
					await new Promise((resolve, reject) => {
						let waitTime = randBetween(settings.orderTimeMin, settings.orderTimeMax, false);
						let start = time();
						log(`⏲ Chờ ${waitTime.toFixed(3)}s`);
	
						let waitInterval = setInterval(() => {
							if (!isRunning) {
								clearInterval(waitInterval);
								reject({ code: 0, description: "Script Stopped" });
								return;
							}

							let now = time();
							info({ progress: ((now - start) / waitTime) * 100 });
	
							if ((now - start) > waitTime) {
								clearInterval(waitInterval);
								resolve();
								return;
							}
						}, 100);
					});

					log(`🛒 Bắt đầu đặt mua`);
					ordering++;

					try {
						let token = await __switchAccount({
							username: account.u,
							password: account.p,
	
							info,
							log,
							clog,
							panic,
							myajax
						});
	
						await __doOrder({
							id: selectedItem.pid,
							count: settings.orderCount,
							token: token.token,
							paymentMethod: settings.paymentMethod,
							shippingAddress: account.a,
							platform: settings.xPlatform,
	
							info,
							log,
							clog,
							panic,
							myajax
						});
					} catch(e) {
						ordering--;
						throw e;
					}

					ordering--;
					log(`🛒 Mua thành công!`);
				} catch(e) {
					let error = parseException(e);
					log(`<span style="color: ${flatc("red")};">⚠ LỖI ${error.code} >>> ${error.description}</span>`);
					fails++;

					// Give a bit of time to chill
					await delayAsync(1000);
				}
			}

			bar.remove();
			resolve();
		}));
	}
})();