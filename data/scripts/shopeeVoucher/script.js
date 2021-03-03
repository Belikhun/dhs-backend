// Script begin here
(async () => {
    let infoUpdateInterval = null;
    let doCheck = true;

    onCancel(() => {
        clearInterval(infoUpdateInterval);
        doCheck = false;
	})
	
	const HOSTADDRESS = "https://shopee.vn";
    const log = (text = "") => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|       Shopee Voucher      |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 00:52:06 04/03/2021  |`);
        log(`|===========================|`);

		info({ hide: true });

		let CSRF = (await this.getCookie(HOSTADDRESS, "csrftoken"));

		if (!CSRF) {
			rejectSetup("Không tìm thấy CSRF Token. Đảm bảo bạn đã đăng nhập vào Shopee!");
			return;
		}

		CSRF = CSRF.value;
		log(`CSRF: ${CSRF}`);

		const getVoucherList = async ({
			campaign,
			platform = "pc"
		} = {}) => {
			let campaignData = await myajax({
				url: `${HOSTADDRESS}/api/v2/microsite/campaign_site_page`,
				method: "GET",
				header: {
					"X-API-SOURCE": platform,
					"X-Requested-With": "XMLHttpRequest",
				},
				query: {
					url: campaign,
					platform,
					_mod: "microsite"
				}
			});

			if (campaignData.error && campaignData.error !== 0) {
				await errored(`Lỗi Khi Lấy Danh Sách Voucher`);
				log(" + Không thể lấy danh sách voucher");
				log(`    + Code: ${campaignData.error}`);
				log(`    + BEE : ${campaignData.be_error}`);
				log(`    + MSG : ${campaignData.error_msg || "Không rõ"}`);
				throw { code: campaignData.error, description: `Lỗi Khi Lấy Danh Sách Voucher`, data: campaignData };
			}

			let voucherList = []
			let promotionList = []

			for (let item of campaignData.data.data.content.children) {
				if (typeof item.children[0].data.promotion_id === "number") {
					voucherList.push({
						type: "simple",
						id: item.children[0].data.promotion_id,
						name: item.meta.name,
						signature: item.children[0].data.promotion_signature,
						image: item.children[0].data.get_voucher_image,
						disabled: !item.children[0].data.microsite_claimable
					});

					continue;
				}

				if (item.children[0].data.vouchers) {
					for (let voucher of item.children[0].data.vouchers)
						promotionList.push({
							"promotionid": voucher.promotion_id,
							"signature": voucher.promotion_signature
						});

					continue;
				}
			}

			// Process Promotion List
			let promotionResponse = await myajax({
				url: `${HOSTADDRESS}/api/v2/voucher_wallet/batch_get_vouchers_by_promotion_ids`,
				method: "POST",
				header: {
					"X-API-SOURCE": platform,
					"X-CSRFToken": CSRF,
					"X-Requested-With": "XMLHttpRequest",
					"FH_Origin": HOSTADDRESS,
					"FH_Referer": `https://shopee.vn/m/${campaign}`,
					"FH_Sec-Fetch-Dest": "empty",
					"FH_Sec-Fetch-Mode": "cors",
					"FH_Sec-Fetch-Site": "same-origin",
					"If-None-Match-": "55b03-2631999c3258f845f93e63e284bd3a2a"
				},
				json: {
					promotion_info: promotionList
				}
			});

			for (let id of Object.keys(promotionResponse.data.id_voucher_mappings)) {
				let voucher = promotionResponse.data.id_voucher_mappings[id];

				if (typeof voucher.coin_cap === "number")
					voucherList.push({
						type: "coinback",
						id: voucher.promotionid,
						code: voucher.voucher_code,
						signature: voucher.signature,
						value: voucher.coin_percentage,
						max: voucher.coin_cap,
						from: voucher.min_spend / 100000,
						cat: voucher.icon_text,
						start: voucher.start_time,
						end: voucher.end_time,
						image: voucher.icon_hash,
						disabled: voucher.fully_redeemed || voucher.has_expired
					});
				else if (typeof voucher.discount_value === "number" && voucher.discount_value > 0)
					voucherList.push({
						type: "discountMoney",
						id: voucher.promotionid,
						code: voucher.voucher_code,
						signature: voucher.signature,
						value: voucher.discount_value / 100000,
						from: voucher.min_spend / 100000,
						terms: voucher.usage_terms,
						cat: voucher.icon_text,
						start: voucher.start_time,
						end: voucher.end_time,
						image: voucher.icon_hash,
						disabled: voucher.fully_redeemed || voucher.has_expired
					});
				else if (typeof voucher.discount_value === "number")
					voucherList.push({
						type: "discountPercent",
						id: voucher.promotionid,
						code: voucher.voucher_code,
						signature: voucher.signature,
						value: voucher.discount_percentage,
						max: voucher.max_value / 100000,
						from: voucher.min_spend / 100000,
						terms: voucher.usage_terms,
						cat: voucher.icon_text,
						start: voucher.start_time,
						end: voucher.end_time,
						image: voucher.icon_hash,
						disabled: voucher.fully_redeemed || voucher.has_expired
					});
				else
					clog("DEBG", voucher);
			}

			return voucherList;
		}

        // Wait for settings
        const preSetup = await setup({
			campaign: { type: "text", label: "Microsite ID" },
			customNote: { type: "note", level: "info", text: `Mỗi voucher một dòng. Danh sách voucher tùy chọn chấp nhận:<t>Mã Voucher (VD: <b>INCU0403</b>)</t><t>ID Voucher (VD: <b>71623643</b>)</t>` },
			customList: { type: "textarea", label: "Danh sách voucher tùy chọn", height: "300px", save: false },
			platform: { type: "text", label: "platform", value: "pc" }
        }, { saveKey: "preSetup" });

		let customVoucherList = preSetup.customList.split("\n")
			.map((i) => !isNaN(i)
				? {
					type: "customID",
					id: i,
					code: null,
					signature: null,
					name: "CUSTOM_ID:" + i
				}
				: {
					type: "customCode",
					id: null,
					code: i,
					signature: null,
					name: "CUSTOM_CODE:" + i
				}
			)

		let voucherList = [
			...customVoucherList,
			... await getVoucherList({
				campaign: preSetup.campaign,
				platform: preSetup.platform
			})
		]
		
		let selectedVoucherList = []
		let voucherData = voucherList
			.reduce((o, i) => { o["vc:" + (i.id || i.code)] = i; return o }, {});
		
		await delayAsync(500);
		
		if (voucherList.length === 0) {
			rejectSetup("Không tìm thấy voucher nào cả!");
			return;
		}

		let voucherSetupData = {}
		for (let item of voucherList)
			switch (item.type) {
				case "simple":
					voucherSetupData["vc:" + item.id] = {
						type: "checkbox",
						label: `
							<b style="font-size: 15px">${item.name}</b>
							${item.image ? `<br><img style="width: 320px; border-radius: 8px;" src="https://cf.shopee.vn/file/${item.image}">` : ""}`,
						color: item.disabled ? "pink" : "blue",
						value: false,
						save: false
					}
					break;

				case "coinback":
					voucherSetupData["vc:" + item.id] = {
						type: "checkbox",
						label: `
							<t>${item.cat || "Không Rõ"} [${item.id}] (hoàn xu)</t>
							<t style="font-size: 13px;">${(new Date(item.start * 1000)).toLocaleString()} <b>-></b> ${(new Date(item.end * 1000)).toLocaleString()}</t>
							<div style="display: flex; flex-direction: row; margin-top: 5px;">
								<img style="width: 64px; height: 64px; border-radius: 8px;" src="https://cf.shopee.vn/file/${item.image}">
								<span style="padding-left: 5px;">
									<b style="font-size: 15px">${item.code}</b>
									<t>Giảm <b>${item.value}%</b> (tối đa <b class="price">${priceFormat(item.max)}</b> xu)</t>
									<t>Từ <b class="price">${priceFormat(item.from)}</b></t>
								</span>
							</div>
						`,
						color: item.disabled ? "pink" : "blue",
						value: false,
						save: false
					}
					break;

				case "discountMoney":
					voucherSetupData["vc:" + item.id] = {
						type: "checkbox",
						label: `
							<t>${item.cat || "Không Rõ"} [${item.id}] (giảm tiền)</t>
							<t style="font-size: 13px;">${(new Date(item.start * 1000)).toLocaleString()} <b>-></b> ${(new Date(item.end * 1000)).toLocaleString()}</t>
							<div style="display: flex; flex-direction: row; margin-top: 5px;" title="${item.terms}">
								<img style="width: 64px; height: 64px; border-radius: 8px;" src="https://cf.shopee.vn/file/${item.image}">
								<span style="padding-left: 5px;">
									<b style="font-size: 15px">${item.code}</b>
									<t>Giảm tối đa <b class="price">${priceFormat(item.value)}</b></t>
									<t>Từ <b class="price">${priceFormat(item.from)}</b></t>
								</span>
							</div>
						`,
						color: item.disabled ? "pink" : "blue",
						value: false,
						save: false
					}
					break;

				case "discountPercent":
					voucherSetupData["vc:" + item.id] = {
						type: "checkbox",
						label: `
							<t>${item.cat || "Không Rõ"} [${item.id}] (giảm tiền theo %)</t>
							<t style="font-size: 13px;">${(new Date(item.start * 1000)).toLocaleString()} <b>-></b> ${(new Date(item.end * 1000)).toLocaleString()}</t>
							<div style="display: flex; flex-direction: row; margin-top: 5px;" title="${item.terms}">
								<img style="width: 64px; height: 64px; border-radius: 8px;" src="https://cf.shopee.vn/file/${item.image}">
								<span style="padding-left: 5px;">
									<b style="font-size: 15px">${item.code}</b>
									<t>Giảm <b>${item.value}%</b> (tối đa <b class="price">${priceFormat(item.max)}</b>)</t>
									<t>Từ <b class="price">${priceFormat(item.from)}</b></t>
								</span>
							</div>
						`,
						color: item.disabled ? "pink" : "blue",
						value: false,
						save: false
					}
					break;

				case "customID":
					voucherSetupData["vc:" + item.id] = {
						type: "checkbox",
						label: `<t>ID Tùy Chỉnh: <b>${item.id}</b></t>`,
						color: "blue",
						value: true,
						save: false
					}
					break;

				case "customCode":
					voucherSetupData["vc:" + item.code] = {
						type: "checkbox",
						label: `<t>Mã Tùy Chỉnh: <b>${item.code}</b></t>`,
						color: "blue",
						value: true,
						save: false
					}
					break;
			
				default:
					clog("WARN", "Unknown item type", item);
					break;
			}

		let selectAllSwitch = createCheckbox({
			label: "Chọn Tất Cả",
			color: "blue",
			value: false
		});

		selectAllSwitch.input.addEventListener("change", (e) => {
			document.querySelectorAll("#scriptSettingsFormList > .checkboxContainer > label > input")
				.forEach(i => i.checked = e.target.checked);
		});

		selectAllSwitch.group.style.width = "100%";
		selectAllSwitch.group.style.marginTop = "10px";

		const voucherSetup = await setup({
				note: { type: "note", level: "info", text: `<b style="font-size: 14px">LỰA CHỌN DANH SÁCH VOUCHER (${voucherList.length})</b><t>Ô chọn màu hồng biểu thị voucher đã hết hàng hoặc đã hết hạn` },
				selectAllSwitch: { type: "customNode", node: selectAllSwitch.group },
				...voucherSetupData
			},
			{ confirm: "Tiếp", saveKey: "vouchers" }
		);

		log("DANH SÁCH VOUCHER:");

		for (let key of Object.keys(voucherSetup)) {
			log(` + ` + pleft(key, 18, true) + ` = ${voucherSetup[key]}`);
			
			if (voucherSetup[key] === true)
				selectedVoucherList.push(voucherData[key]);
		}

		await delayAsync(500);
		
        log("Đang chờ cài đặt từ người dùng");
        // Wait for settings
        const settings = await setup({
            timeCheckInterval: { type: "number", label: "Thời gian giữa mỗi lần thử", value: 100 }
        });
    
        log("CÀI ĐẶT:");

        for (let key of Object.keys(settings))
            log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
        // Start
        let checkNth = 0;
		let successCount = 0;
		let start = time();
		let total = selectedVoucherList.length;
		let checkPer = settings.timeCheckInterval;
		
		runInfo({
			end: checkPer + "ms",
			target: total
		});

		let checker = async () => {
			let updatedVoucherList = null;

			for (let i = 0; i < selectedVoucherList.length; i++) {
				if (selectedVoucherList[i].added)
					continue;

				let item = selectedVoucherList[i];
				checkNth++;

				log();
				log(`🎫 ${item.name || item.code || "VC:" + item.id} (ID ${item.id})`);

				if (!item.id || !item.signature) {
					if (!updatedVoucherList) {
						heartbeat({ color: "blue" });
						log(`🎫 Cập nhật danh sách Voucher`);
						updatedVoucherList = await getVoucherList({
							campaign: preSetup.campaign,
							platform: preSetup.platform
						});
					}

					let found = false;
					for (let voucher of updatedVoucherList)
						if (voucher.id && voucher.id == item.id) {
							heartbeat({ color: "green" });
							selectedVoucherList[i].code = voucher.code;
							selectedVoucherList[i].signature = voucher.signature;

							item = selectedVoucherList[i];
							log(`🎫 ĐÃ TÌM THẤY!`);
							log(` + Code     : ${item.code}`);
							log(` + Signature: ${item.signature}`);
							found = true;
						} else if (voucher.code && voucher.code == item.code) {
							heartbeat({ color: "green" });
							selectedVoucherList[i].id = voucher.id;
							selectedVoucherList[i].signature = voucher.signature;

							item = selectedVoucherList[i];
							log(`🎫 ĐÃ TÌM THẤY!`);
							log(` + ID       : ${item.id}`);
							log(` + Signature: ${item.signature}`);
							found = true;
						}

					if (!found) {
						heartbeat({ color: "red" });
						log(`🎫 Không tìm thấy ID hoặc chữ kí của Voucher này`);
						continue;
					}
				}

				let reqStart = time();
				let data = {}
				
				try {
					data = await myajax({
						url: `${HOSTADDRESS}/api/v2/voucher_wallet/save_voucher`,
						method: "POST",
						header: {
							"X-API-SOURCE": preSetup.platform,
							"X-CSRFToken": CSRF,
							"X-Requested-With": "XMLHttpRequest",
							"FH_Origin": HOSTADDRESS,
							"FH_Referer": `https://shopee.vn/m/${preSetup.campaign}`,
							"FH_Sec-Fetch-Dest": "empty",
							"FH_Sec-Fetch-Mode": "cors",
							"FH_Sec-Fetch-Site": "same-origin",
							"If-None-Match-": "55b03-2631999c3258f845f93e63e284bd3a2a"
						},
						json: {
							signature: item.signature,
							voucher_promotionid: item.id
						}
					})
				} catch(e) {
					heartbeat({ color: "red" });
					log("⚠ Lỗi đã xảy ra khi thêm voucher vào ví");
					log(` + Code: ${e.code}`);
					log(` + MSG : ${e.description || "Không Rõ"}`);
					log(` + Bỏ qua lỗi: true`);
	
					let reqTime = ((time() - reqStart) * 1000);
					let reqTimeAT = (reqTime / checkPer) * 100;
					runInfo({
						dataType: "time",
						progress: reqTimeAT,
						now: reqTime.toFixed(2) + "ms",
						itemStatus: "LỖI ĐÃ XẢY RA",
						itemStatusColor: "red",
						checkDetail: "Một lỗi đã xảy ra trong quá trình thêm voucher"
					});
	
					return;
				}
				
				let reqTime = ((time() - reqStart) * 1000);
				let reqTimeAT = (reqTime / checkPer) * 100;
		
				runInfo({
					dataType: "time",
					progress: reqTimeAT,
					now: reqTime.toFixed(2) + "ms",
					current: successCount,
					saved: (successCount / total) * 100,
					itemStatus: item.name || item.code || "VC:" + item.id,
					itemStatusColor: "yellow",
					checkDetail: `Check ${checkNth}`
				})
	
				heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

				if (data.error && data.error !== 0) {
					log(` + Code: ${data.error}`);
					log(` + MSG : ${data.error_msg || "Không rõ"}`);

					if (data.error !== 5)
						continue;
				}

				order();
				successCount++;
				heartbeat({ color: "green" });
				log(`✅ Thêm Thành Công (${successCount}/${total})`);
				selectedVoucherList[i].added = true;

				if (successCount === total) {
					doCheck = false;
					complete();
					runInfo({
						dataType: "time",
						current: successCount,
						saved: (successCount / total) * 100,
						itemStatus: `ĐÃ THÊM ${successCount} VOUCHER`,
						itemStatusColor: "green",
						progress: 100,
						progWarn: false,
						checkDetail: "Chạy kết thúc"
					});

					log("CHẠY KẾT THÚC");
				}
			}
		}
	
		let __checkHandler = async () => {
			if (!doCheck)
				return;
	
			let timeStart = time();
			await checker();
			setTimeout(() => __checkHandler(), checkPer - ((time() - timeStart) * 1000));
		}
	
		infoUpdateInterval = setInterval(() => {
			let runTime = time() - start;
			runInfo({ dataType: "time", time: runTime });
		}, 60);

        log("Bắt đầu chạy");
        __checkHandler();
    } catch(e) {
        triggerError(e);
        return;
    }
})()