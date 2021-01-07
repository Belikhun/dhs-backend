// Script begin here
(async () => {
	let infoUpdateInterval = null;
	let executeJob = true;

	onCancel((stop) => {
		if (stop)
			this.subScreen.hide();

		clearInterval(infoUpdateInterval);
		executeJob = false;
	});

	const RENTCODE = "https://api.rentcode.net";
	const log = (text, overwrite = false) => writeLog(text, overwrite);

	try {
		log(`|===========================|`);
		log(`|   Tiki Account Register   |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 10:04:43 31/12/2020  |`);
		log(`|===========================|`);

		await info({ hide: true });

		let container = buildElementTree("div", [], [
			{ type: "div", class: "header", name: "header", list: [
				{ type: "t", class: "left", name: "left", text: "Tiki Account" },
				{ type: "t", class: "right", name: "right", list: [
					{ name: "exportList", node: createBtn("Xuất Danh Sách", "green", {
						icon: "list"
					}) },

					{ name: "exportExcel", node: createBtn("Xuất EXCEL", "blue", {
						icon: "excel"
					}) }
				] }
			] },
			{ type: "table", class: "simpleTable", name: "table", list: [
				{ type: "tr", name: "tr", list: [
					{ type: "th", name: "nth", text: "#" },
					{ type: "th", name: "phone", text: "Số Điện Thoại" },
					{ type: "th", name: "email", text: "Email" },
					{ type: "th", name: "password", text: "Mật Khẩu" },
					{ type: "th", name: "name", text: "Tên" },
					{ type: "th", name: "addresss", text: "Địa Chỉ" },
					{ type: "th", name: "status" }
				] }
			] }
		]).obj;

		//? ================ ADDRESS PICKER ================

		log(`🌏 Fetching VN Regions List`);
		let vnRegion = await myajax({
			url: `${HOSTADDRESS}/api/v2/directory/regions`,
			method: "GET",
			header: {
				"X-Access-Token": await getToken(true, true)
			},
			query: {
				country_id: "vn"
			}
		});

		let vnRegionOptions = {};
		for (let item of vnRegion.data)
			vnRegionOptions[item.id] = `${item.name} (${item.id})`;

		let addressPicker = buildElementTree("div", "addressPicker", [
			{ name: "region", node: createInput({
				type: "select",
				label: "Tỉnh/Thành Phố",
				value: await this.dataLoad(`settings.tikiRegister.region`) || 302,
				options: vnRegionOptions
			}) },

			{ name: "district", node: createInput({
				type: "select",
				label: "Quận/Huyện"
			}) },

			{ name: "ward", node: createInput({
				type: "select",
				label: "Phường/Xã"
			}) },
		]).obj;

		addressPicker.region.onChange(async (v) => {
			addressPicker.district.set({ options: {} });

			if (v == "")
				return;

			let districts = await myajax({
				url: `${HOSTADDRESS}/api/v2/directory/districts`,
				method: "GET",
				header: {
					"X-Access-Token": await getToken(true, true)
				},
				query: {
					region_id: v
				}
			});

			let districtOptions = {};
			for (let item of districts.data)
				districtOptions[item.id] = `${item.name} (${item.id})`;

			addressPicker.district.set({
				value: await this.dataLoad(`settings.tikiRegister.district`) || 24,
				options: districtOptions
			});

			await this.dataSave({ "settings.tikiRegister.region": v });
		});

		addressPicker.district.onChange(async (v) => {
			addressPicker.ward.set({ options: {} });

			if (v == "")
				return;

			let wards = await myajax({
				url: `${HOSTADDRESS}/api/v2/directory/wards`,
				method: "GET",
				header: {
					"X-Access-Token": await getToken(true, true)
				},
				query: {
					district_id: v
				}
			});

			let wardOptions = {};
			for (let item of wards.data)
				wardOptions[item.id] = `${item.name} (${item.id})`;

			addressPicker.ward.set({
				value: await this.dataLoad(`settings.tikiRegister.ward`) || 4786,
				options: wardOptions
			});

			await this.dataSave({ "settings.tikiRegister.district": v });
		});

		addressPicker.ward.onChange((v) => (v != "") ? this.dataSave({ "settings.tikiRegister.ward": v }) : false);
		addressPicker.style.width = "100%";

		//? ================ MAIN SETTINGS ================

		this.subScreen.show(container, "accountsRegister");

		const settings = await setup({
			count: { type: "number", label: "Số lượng đăng kí", value: 1 },
			emailNote: { type: "note", level: "info", text: `Biến <pre>%i%</pre> sẽ chạy từ 1 tới số lượng đăng kí\n<b>VD: </b><pre>somemail.%i%@gmail.com</pre>` },
			email: { type: "text", label: "Email", required: true, save: false },
			password: { type: "text", label: "Mật khẩu (bỏ trống để random)" },
			nameNote: { type: "note", level: "info", text: `Mỗi lựa chọn của tên nằm trên một dòng` },
			firstName: { type: "textarea", label: "Họ", height: "80px", value: "Lại\nVẫn\nHình như\nĐúng", required: true },
			middleName: { type: "textarea", label: "Tên Đệm", height: "80px", value: "Là\nThành", required: true },
			lastName: { type: "textarea", label: "Tên", height: "80px", value: "Toàn\nTí\nTèo\nTùng", required: true },
			gender: {
				type: "radio",
				label: "Giới Tính",
				required: true,
				list: [
					{ name: `Nam`, color: "blue", value: "male", checked: true },
					{ name: `Nữ`, color: "pink", value: "female" }
				]
			},
			company: { type: "text", label: "Công Ty" },
			addressPicker: { type: "customNode", node: addressPicker },
			streetNote: { type: "note", level: "info", text: `Mỗi địa chỉ nằm trên một dòng. Sử dụng <pre>%random%</pre> để thêm số nhà ngẫu nhiên trong khoảng 1 - 999` },
			street: { type: "textarea", label: "Địa Chỉ", height: "140px", value: `%random%, Trương hán siêu\n%random%, nhà trẻ tân thịnh` },
			addressType: {
				type: "radio",
				label: "Loại Địa Chỉ",
				required: true,
				list: [
					{ name: `Nhà Riêng/Chung Cư`, color: "pink", value: "home", checked: true },
					{ name: `Cơ Quan/Công Ty`, color: "blue", value: "company" }
				]
			},
			phoneNumber: { type: "textarea", label: "SĐT nhận hàng (Bỏ trống dùng số mặc định)", height: "140px", value: `0123456789\n0762238661` },
			rentCodeNote: { type: "note", level: "info", text: `<b>RENTCODE</b>` },
			apiKey: { type: "text", label: "API KEY", required: true },
			serviceID: { type: "number", label: "Service ID", value: 31, required: true },
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

		settings.firstName = settings.firstName.split("\n");
		settings.middleName = settings.middleName.split("\n");
		settings.lastName = settings.lastName.split("\n");
		settings.street = settings.street.split("\n");
		settings.phoneNumber = settings.phoneNumber.split("\n");
		settings.region = addressPicker.region.input.value;
		settings.district = addressPicker.district.input.value;
		settings.ward = addressPicker.ward.input.value;

		log("⚙ CÀI ĐẶT:");

		for (let key of Object.keys(settings))
			log(` + ` + pleft(key, 12, true) + ` = ${settings[key]}`);

		//? ======================= DEFINE =======================
		let tableDatas = [["SỐ ĐIỆN THOẠI", "EMAIL", "MẬT KHẨU", "TÊN", "ĐỊA CHỈ", "SĐT NHẬN HÀNG", "TÌNH TRẠNG"]]

		// Export
		container.header.right.exportList.addEventListener("click", () => {
			let listNode = htmlToElement(`<pre>${
				tableDatas
					.filter((n, i) => (i !== 0 && n[6] === "OKAY"))
					.map((n, i) => (i !== 0) ? `${n[0]}:${n[2]}` : ``)
					.join("\n")
			}</pre>`);

			listNode.style.fontSize = "16px";

			popup.show({
				windowTitle: "Tiki Account Register",
				title: "Tiki Register",
				message: "Danh Sách Tài Khoản",
				description: "",
				icon: "list",
				customNode: listNode, 
				buttonList: {
					close: { text: "Đóng", color: "red" }
				}
			});
		});

		container.header.right.exportExcel.addEventListener("click", () => {
			let xls = new XlsExport(tableDatas.filter((n, i) => (i === 0 || n[6] === "OKAY")), "DHS Tiki Register");
			xls.exportToXLS();
		});

		const logStatus = (text, logger = log) => {
			let logNode = document.createElement("div");
			logNode.style.display = "flex";
			logNode.style.flexDirection = "row";

			let textNode = document.createElement("span");
			textNode.style.flexGrow = 1;
			textNode.innerHTML = text;

			let statusNode = document.createElement("span");
			statusNode.style.display = "inline-flex";
			statusNode.style.flexDirection = "row";
			statusNode.style.alignItems = "center";
			statusNode.style.flexShrink = 0;
			statusNode.style.width = "60px";

			logNode.append(textNode, statusNode);

			logger(logNode);

			const set = ({ text, status }) => {
				if (!executeJob)
					throw { code: 0, description: "Script Stopped" }

				if (this.logsViewer.lockLogs)
					this.logsViewer.toBottom();

				if (text)
					textNode.innerHTML = text;

				if ([-1, 0, 1].includes(status))
					statusNode.innerHTML = [
						`<font style="display: contents;" color="#ff89af"><span style="display: inline-block; width: 16px; text-align: center;">✗</span> ERRR</font>`,
						`<font style="display: contents;" color="#fdff89"><span style="display: inline-block; width: 16px; text-align: center;" class="simpleSpinner"></span> WAIT</font>`,
						`<font style="display: contents;" color="#89ffa8"><span style="display: inline-block; width: 16px; text-align: center;">✓</span> OKAY</font>`
					][status + 1];
			}

			set({ status: 0 });

			return {
				logNode,
				set
			}
		}

		const randomName = () => [
			randItem(settings.firstName),
			randItem(settings.middleName),
			randItem(settings.lastName)
		].join(" ");

		const createTableRow = ({
			phone,
			email,
			password,
			name,
			address,
			receiveNumber
		} = {}) => {
			let row = buildElementTree("tr", "row", [
				{ type: "td", name: "nth" },
				{ type: "td", name: "phone", text: phone },
				{ type: "td", name: "email", text: email },
				{ type: "td", name: "password", text: password },
				{ type: "td", name: "name", text: name },
				{ type: "td", name: "address", html: address + `<br>${receiveNumber || "N/A"}` },
				{ type: "td", name: "status" }
			]).obj;

			container.table.appendChild(row);

			let tableIndex = tableDatas.length;
			tableDatas[tableIndex] = [phone, email, password, name, address, receiveNumber, "STALL"]

			const update = ({
				phone,
				address,
				status,
				receiveNumber
			} = {}) => {
				if (!executeJob)
					throw { code: 0, description: "Script Stopped" }

				if (phone)
					row.phone.innerText = phone;

				if (address) {
					if (receiveNumber)
						tableDatas[tableIndex][5] = receiveNumber;
						
					row.address.innerHTML = address + `<br>${tableDatas[tableIndex][5] || "N/A"}`;
				}

				if ([-1, 0, 1].includes(status)) {
					if (status === 1)
						tableDatas[tableIndex][6] = "OKAY";

					statusText = [
						`<font color="#ff89af"><span>✗</span> ERRR</font>`,
						`<font color="#fdff89"><span class="simpleSpinner"></span> WAIT</font>`,
						`<font color="#89ffa8"><span>✓</span> OKAY</font>`
					][status + 1];

					row.status.innerHTML = statusText;
				}
			}

			update({ status: 0 });

			return {
				row,
				update
			}
		}

		const randomStreet = () => randItem(settings.street).replaceAll("%random%", randBetween(1, 999, true));

		const getStatus = async (id) => {
			let rentCodeOrder = await myajax({
				url: `${RENTCODE}/api/v2/order/${id}/check`,
				method: "GET",
				query: {
					apiKey: settings.apiKey,
					serviceProviderId: settings.serviceID
				}
			});

			if (!rentCodeOrder.success)
				throw { code: -1, description: `getStatus(${id}): ${rentCodeOrder.message}`, data: { message: rentCodeOrder.message } }

			return rentCodeOrder;
		}

		const doRegister = async ({
			i,
			set = () => {},

			logState = logStatus,
			log = writeLog,
			myajax = window.myajax
		} = {}) => {
			if (!executeJob)
				throw { code: 0, description: "Script Stopped" }

			log(`========= TÀI KHOẢN ${i + 1} =========`);
	
			let fullName = randomName();
			let email = settings.email.replaceAll("%i%", i + 1);
			let password = (settings.password == "") ? randString(16) : settings.password;
			let gender = settings.gender;
			let birthday = `${randBetween(1980, 2000, true)}-${randBetween(1, 12, true)}-${randBetween(1, 29, true)}`;
			let newsletter = false;
			let street = randomStreet();
			let receiveNumber = randItem(settings.phoneNumber);

			log(`Tên:         	${fullName}`);
			log(`Email:       	${email}`);
			log(`Password:    	${password}`);
			log(`Gender:      	${gender}`);
			log(`Birthday:    	${birthday}`);
			log(`News Letter: 	${newsletter}`);
			log(`Street:      	${street}`);
			log(`Address Phone: ${receiveNumber || "N/A"}`);

			let logg;
			let row = createTableRow({
				phone: "N/A",
				email,
				password,
				name: fullName,
				address: street,
				receiveNumber
			});

			try {
				// ================== GET TIKI GUEST TOKEN ==================
				set(0, "Lấy Tiki Guest Token");
				logg = logState("Lấy Tiki Guest Token");
				let tikiTokens = await myajax({
					url: `${HOSTADDRESS}/api/v2/tokens`,
					method: "POST",
					form: {
						grant_type: "guest"
					}
				});
	
				if (!tikiTokens.guest_token)
					throw { code: -1, description: "Không Tìm Thấy Token" }
			
				let TOKEN = tikiTokens.guest_token;
				logg.set({ status: 1 });
				log(`🔑 ${TOKEN}`);

				// ================== CREATE RENTCODE ORDER ==================
				set(20, "Tiến hành tạo Order Rentcode");
				logg = logState("Tiến hành tạo Order Rentcode");
				let rentCodeOrder = await myajax({
					url: `${RENTCODE}/api/v2/order/request`,
					method: "GET",
					query: {
						apiKey: settings.apiKey,
						serviceProviderId: settings.serviceID
					}
				});

				if (!rentCodeOrder.success)
					throw { code: -1, description: rentCodeOrder.message }

				let orderID = rentCodeOrder.id;
				logg.set({ status: 1 });
				log(` → ID: ${orderID}`);

				// ================== GET PHONE NUMBER ==================
				set(40, "Lấy số điện thoại");
				logg = logState("Lấy số điện thoại");
				let phoneNumber
				let phoneTries = 0

				while (!phoneNumber) {
					await delayAsync(1000);
					phoneTries++;

					let rentCodeOrder = await getStatus(orderID);

					if (!rentCodeOrder.success || !rentCodeOrder.phoneNumber) {
						logg.set({ text: `Lấy số điện thoại [${phoneTries}]\n (Chưa thấy SĐT)` });
						continue;
					}

					phoneNumber = rentCodeOrder.phoneNumber;
				}

				logg.set({ text: `Lấy số điện thoại [${phoneTries}]`, status: 1 });
				log(` → SDT: ${phoneNumber}`);

				if (!receiveNumber || receiveNumber == "")
					receiveNumber = phoneNumber;

				row.update({ phone: phoneNumber, address: street, receiveNumber });

				// ================== SEND OTP ==================
				set(60, "Gửi mã OTP");
				logg = logState("Gửi mã OTP");
				await myajax({
					url: `${HOSTADDRESS}/api/v2/customers/otp_codes`,
					method: "POST",
					type: "text",
					header: {
						"Accept": "application/json, text/plain, */*",
						"FH_Origin": HOSTADDRESS,
						"FH_Referer": `${HOSTADDRESS}/`,
						"FH_Sec-Fetch-Dest": "empty",
						"FH_Sec-Fetch-Mode": "cors",
						"FH_Sec-Fetch-Site": "same-origin",
						"X-Guest-Token": TOKEN
					},
					json: {
						"phone_number": phoneNumber
					}
				});

				logg.set({ status: 1 });

				// ================== GET OTP ==================
				set(70, "Lấy mã OTP");
				logg = logState("Lấy mã OTP");

				let OTP;
				let OPTTries = 0;

				while (!OTP) {
					if (!executeJob)
						throw { code: 0, description: "Script Stopped" }

					await delayAsync(1000);
					OPTTries++;

					logg.set({ text: `Lấy mã OTP [${OPTTries}]` });

					if (OPTTries > 200) {
						logg.set({ text: `Lấy mã OTP [${OPTTries}]\n (Quá Thời Gian Chờ)` });
						throw { code: -1, description: `Lấy mã OTP [${OPTTries}] (Quá Thời Gian Chờ)`, data: { tries: OPTTries } }
					}

					try {
						let orderStatus = await getStatus(orderID);

						if (orderStatus.message) {
							let messageRe = /(\d{6})/gm.exec(orderStatus.message);

							if (!messageRe) {
								logg.set({ text: `Lấy mã OTP [${OPTTries}]\n (Regex Not Match)` });
								continue;
							}

							OTP = messageRe[1];
						}
					} catch(error) {
						let e = parseException(error);
						logg.set({ text: `Lấy mã OTP [${OPTTries}]\n (${e.code} >>> ${e.description})`, status: -1 });
						continue;
					}
				}

				logg.set({ text: `Lấy mã OTP [${OPTTries}]`, status: 1 });
				log(` → OTP: ${OTP}`);

				// ================== REGISTER ==================
				set(80, "Đăng kí tài khoản");
				logg = logState("Đăng kí tài khoản");

				try {
					await myajax({
						url: `${HOSTADDRESS}/api/v2/customers`,
						method: "POST",
						header: {
							"FH_Origin": HOSTADDRESS,
							"FH_Referer": `${HOSTADDRESS}/`,
							"FH_Sec-Fetch-Dest": "empty",
							"FH_Sec-Fetch-Mode": "cors",
							"FH_Sec-Fetch-Site": "same-origin",
							"X-Guest-Token": TOKEN
						},
						form: {
							"full_name": fullName,
							"phone_number": phoneNumber,
							"otp_code": OTP,
							"email": email,
							"password": password,
							"gender": gender,
							"birthday": birthday,
							"newsletter": newsletter
						}
					});
				} catch(error) {
					if (error.data.error)
						throw { code: error.data.error.code, description: `Đăng kí tài khoản: ${error.data.error.errors[0].message}`, data: error.data.error }
				}
				
				logg.set({ status: 1 });
				log(` → ACC: ${phoneNumber}:${password}`);

				// ================== GET TIKI TOKEN ==================
				set(90, "Đăng nhập vào Tài Khoản");
				logg = logState("Đăng nhập vào Tài Khoản");
				let loginTries = 0;

				while (true) {
					if (!executeJob)
						throw { code: 0, description: "Script Stopped" }

					await delayAsync(1000);
					loginTries++;

					logg.set({ text: `Đăng nhập vào Tài Khoản [${loginTries}]` });

					if (loginTries > 10) {
						logg.set({ text: `Đăng nhập vào Tài Khoản [${loginTries}]\n (Quá Thời Gian Chờ)` });
						throw { code: -1, description: `Đăng nhập vào Tài Khoản [${loginTries}] (Quá Thời Gian Chờ)`, data: { tries: loginTries } }
					}

					try {
						let tikiTokens = await myajax({
							url: `${HOSTADDRESS}/api/v3/tokens`,
							method: "POST",
							header: {
								"FH_Origin": HOSTADDRESS,
								"FH_Referer": `${HOSTADDRESS}/`,
								"FH_Sec-Fetch-Dest": "empty",
								"FH_Sec-Fetch-Mode": "cors",
								"FH_Sec-Fetch-Site": "same-origin",
								"X-Guest-Token": TOKEN
							},
							json: {
								"email": phoneNumber,
								"grant_type": "password",
								"password": password
							}
						});
		
						if (!tikiTokens.access_token)
							throw { code: -1, description: `Không tìm thấy ACCESS_TOKEN` }
	
						TOKEN = tikiTokens.access_token;
						break;
					} catch(error) {
						let e = parseException(error);
						logg.set({ text: `Đang Đăng Nhập [${loginTries}]\n (${e.code} >>> ${e.description})` });
						continue;
					}
				}

				logg.set({ status: 1 });

				// ================== ADD ADDRESS ==================
				set(95, "Thêm địa chỉ");
				logg = logState("Thêm địa chỉ");

				try {
					await myajax({
						url: `${HOSTADDRESS}/api/v2/me/addresses`,
						method: "POST",
						header: {
							"FH_Origin": HOSTADDRESS,
							"FH_Referer": `${HOSTADDRESS}/`,
							"FH_Sec-Fetch-Dest": "empty",
							"FH_Sec-Fetch-Mode": "cors",
							"FH_Sec-Fetch-Site": "same-origin",
							"X-Access-Token": TOKEN
						},
						json: {
							"city_id": settings.district,
							"company": (settings.company === "") ? null : settings.company,
							"delivery_address_type": settings.addressType,
							"full_name": fullName,
							"is_default": true,
							"region_id": settings.region,
							"street": street,
							"telephone": receiveNumber,
							"ward_id": settings.ward
						}
					});
				} catch(error) {
					if (error.data.error)
						throw { code: error.data.error.code, description: `Thêm địa chỉ: ${error.data.error.errors[0].message}`, data: error.data.error }
				}

				logg.set({ status: 1 });
			} catch(error) {
				clog("ERRR", error);
				let e = parseException(error);
				logg.set({ status: -1 });
				row.update({ status: -1 });
				log(` → Reason: ${e.code} >>> ${e.description}`);
				set(-1);
				return false;
			}

			set(100, "Thành Công");
			row.update({ status: 1 });
			return true;
		}

		//? ======================= START =======================
		run();

		infoUpdateInterval = setInterval(() => {
			let runTime = time() - start;
			runInfo({ time: runTime, dataType: "time" });
		}, 60)

		let successCount = 0;
		let start = time();

		if (settings.proxy) {
			let availables = proxy.readyList();
			let inQueue = settings.count;
			let threadProgress = []
			let promises = []

			runInfo({
				checkDetail: `Multi Threaded (${availables.length})`,
				dataType: "time",
			});

			for (let threadNum = 0; threadNum < availables.length; threadNum++)
				promises.push(new Promise(async (resolve) => {
					let fails = 0;
					let server = proxy.assign();
					let jarID = randString(16);
					let bar = subBar({ progress: 0 });
					let logs = logGroup(`[THREAD ${threadNum}]: Using ${server} (${fails} fails)`);
					logs.setColor(oscColor("blue"));

					// Overwrite Global Function
					let info = ({ progress = null }) => {
						if (progress) {
							bar.set({ progress });

							threadProgress[threadNum] = progress;

							runInfo({
								progress: threadProgress.reduce((t, n) => t + n, 0) / threadProgress.length,
								progWarn: false,
								now: successCount,
								end: settings.count,
								current: inQueue,
								target: 0,
								dataType: "time"
							});
						}
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
							throw e.data;
						}
					}

					//* =============== MAIN LOGIC ================
					log(`🛰 ${server}`);
					log(`🛢 ${jarID}`);

					while (inQueue > 0) {
						inQueue--;
		
						if (!await doRegister({
							i: (settings.count - inQueue) - 1,
							set: (p, t) => {
								if (p != -1)
									info({ progress: p });
							},

							logState: (text) => logStatus(text, log),
							log,
							myajax
						})) {
							fails++;
							sounds.warning();
							logs.setTitle(`[THREAD ${threadNum}]: Using ${server} (${fails} fails)`);
							bar.set({ color: "red" });
							heartbeat({ color: "red", beat: false });
						} else
							successCount++;
					}

					logs.setColor(oscColor(fails === 0 ? "green" : "yellow"));
					resolve();
				}));

			await Promise.all(promises);
		} else {
			for (let i = 0; i < settings.count; i++)
				runInfo({
					now: i + 1,
					end: settings.count,
					target: 100,
					checkDetail: "Single Threaded",
					itemStatusColor: "yellow",
					dataType: "time",
				});

				if (await doRegister({ i, set: (p, t) => {
						if (p == -1)
							runInfo({
								progress: 100,
								itemStatus: t,
								itemStatusColor: "red",
								dataType: "time"
							});
						else
							runInfo({
								progress: (1 / settings.count) * ((i * 100) + p),
								progWarn: false,
								current: p,
								itemStatus: t,
								dataType: "time"
							});
					}
				})) {
					successCount++;
				}
		}

		complete();
		runInfo({
			itemStatus: `ĐÃ ĐĂNG KÍ ${successCount} TÀI KHOẢN`,
			itemStatusColor: (successCount === settings.count ? "green" : "yellow"),
			progress: 100,
			progWarn: false,
			checkDetail: "Script Completed",
			dataType: "time",
		});
	} catch(e) {
		triggerError(e);
		return;
	}
})()