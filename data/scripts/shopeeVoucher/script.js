// Script begin here
(async () => {
    var infoUpdateInterval = null;
    var doCheck = true;

    onCancel(() => {
        clearInterval(infoUpdateInterval);
        doCheck = false;
	})
	
	const HOSTADDRESS = "https://shopee.vn";
    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|       Shopee Voucher      |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 00:36:34 14/04/2020  |`);
        log(`|===========================|`);

		info({ hide: true });

		const CSRF = (await this.getCookie(HOSTADDRESS, "csrftoken")).value;
		log(`CSRF: ${CSRF}`);

        // Wait for settings
        const preSetup = await setup({
			campaign: { type: "text", label: "Microsite ID" },
			platform: { type: "text", label: "platform", value: "pc" }
        }, { saveKey: "preSetup" });

		let APISource = preSetup.platform;
		let selectedVoucherList = []
		
		let campaignData = await myajax({
			url: `${HOSTADDRESS}/api/v2/microsite/campaign_site_page`,
			method: "GET",
			header: {
				"X-API-SOURCE": APISource,
				"X-Requested-With": "XMLHttpRequest",
			},
			query: {
				url: preSetup.campaign,
				platform: APISource,
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

		voucherList = []

		for (let item of campaignData.data.data.content.children) {
			if (typeof item.children[0].data.promotion_id === "number") {
				voucherList.push({
					id: item.children[0].data.promotion_id,
					name: item.meta.name,
					signature: item.children[0].data.promotion_signature,
					image: item.children[0].data.get_voucher_image
				});

				continue;
			}

			if (item.children[0].data.vouchers) {
				for (let voucher of item.children[0].data.vouchers)
					voucherList.push({
						id: voucher.promotion_id,
						name: voucher.display_shop_name,
						signature: voucher.promotion_signature,
						image: null
					});

				continue;
			}
		}

		voucherData = voucherList
			.reduce((o, i) => { o[i.name] = i; return o }, {});

		await delayAsync(500);
		
		if (voucherList.length === 0) {
			rejectSetup("Không tìm thấy voucher nào cả!");
			return;
		}

		let voucherSetupData = {
			note: { type: "note", level: "info", text: `<b style="font-size: 14px">LỰA CHỌN DANH SÁCH VOUCHER (${voucherList.length})</b>` }
		}

		for (let item of voucherList)
			voucherSetupData[item.name] = {
				type: "checkbox",
				label: `<b style="font-size: 15px">${item.name}</b>${item.image ? `<br><img style="width: 320px; margin-top: 10px; border-radius: 8px;" src="https://cf.shopee.vn/file/${item.image}">` : ""}`,
				color: "blue",
				value: false
			}

		const voucherSetup = await setup(voucherSetupData, { confirm: "Tiếp", saveKey: "vouchers" });

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
        var checkNth = 0;
		var successCount = 0;
		var start = time();
		var total = selectedVoucherList.length;
		var checkPer = settings.timeCheckInterval;
		
		runInfo({
			end: checkPer + "ms",
			target: total
		});

		var checker = async () => {
			for (let i = 0; i < selectedVoucherList.length; i++) {
				let item = selectedVoucherList[i];
				checkNth++;

				log(`🎫 ${item.name} (ID ${item.id})`);
				let reqStart = time();
				let data = {}
				
				try {
					data = await myajax({
						url: `${HOSTADDRESS}/api/v2/voucher_wallet/save_voucher`,
						method: "POST",
						header: {
							"X-API-SOURCE": APISource,
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
					log(" + Lỗi đã xảy ra khi lấy thông tin Item");
					log(`    + Code: ${e.code}`);
					log(`    + MSG : ${e.description || "Không Rõ"}`);
					log(`    + Bỏ qua lỗi: true`);
	
					let reqTime = ((time() - reqStart) * 1000);
					let reqTimeAT = (reqTime / checkPer) * 100;
					runInfo({
						dataType: "time",
						progress: reqTimeAT,
						now: reqTime.toFixed(2) + "ms",
						itemStatus: "LỖI ĐÃ XẢY RA",
						itemStatusColor: "red",
						checkDetail: "Một lỗi đã xảy ra trong quá trình kiểm tra giá Item"
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
					itemStatus: item.name,
					itemStatusColor: "yellow",
					checkDetail: `Check ${checkNth}`
				})
	
				heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });

				if (data.error && data.error !== 0) {
					log(` + Code: ${data.error}`);
					log(` + MSG : ${data.error_msg || "Không rõ"}`);
					continue;
				}

				order();
				successCount++;
				log(` ✅ Thêm Thành Công (${successCount}/${total})`);
				selectedVoucherList = selectedVoucherList.splice(i, 1);

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
	
		var __checkHandler = async () => {
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