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
        log(`|   Shopee Voucher Hunter   |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 01:25:18 04/03/2021  |`);
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
        const settings = await setup({
			campaign: { type: "text", label: "Microsite ID" },
			timeCheckInterval: { type: "number", label: "Thời gian giữa mỗi lần thử", value: 100 },
			platform: { type: "text", label: "platform", value: "pc" }
        }, { saveKey: "preSetup" });
    
        log("CÀI ĐẶT:");

        for (let key of Object.keys(settings))
            log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

		log("Đang bắt đầu chạy...");
		run();
		
        // Start
        let checkNth = 0;
		let successCount = 0;
		let start = time();
		let checkPer = settings.timeCheckInterval;
		let firstScan = []
		
		runInfo({
			end: checkPer + "ms",
			target: 0
		});

		let checker = async () => {
			if (firstScan.length === 0) {
				runInfo({
					dataType: "time",
					itemStatus: "ĐANG QUÉT",
					itemStatusColor: "blue",
					checkDetail: "Quét lần đầu"
				});

				log(`🎫 Đang lấy danh sách lần đầu`);
				firstScan = (await getVoucherList({
					campaign: settings.campaign,
					platform: settings.platform
				})).map(i => i.id);
				log(` + Quét được ${firstScan.length} voucher`);
			}

			checkNth++;
			heartbeat({ color: "blue" });
			log();
			log(`🎫 Đang quét (lần ${checkNth})`);

			let scanStart = time();
			let voucherList = await getVoucherList({
				campaign: settings.campaign,
				platform: settings.platform
			});

			let scanTime = ((time() - scanStart) * 1000);
			let scanTimeAT = (scanTime / checkPer) * 100;
			runInfo({
				dataType: "time",
				progress: scanTimeAT,
				now: scanTime.toFixed(2) + "ms",
				itemStatus: "ĐANG QUÉT",
				itemStatusColor: ((scanTimeAT > 80) ? "yellow" : "green"),
				checkDetail: `Quét lần ${checkNth}`
			});
			
			for (let i = 0; i < voucherList.length; i++) {
				let item = voucherList[i];
				
				if (firstScan.includes(item.id))
					continue;

				log(`🎫 ${item.name || item.code || "VC:" + item.id} (ID ${item.id})`);

				if (!item.id || !item.signature) {
					heartbeat({ color: "red" });
					log(`🎫 Không tìm thấy ID hoặc chữ kí của Voucher này`);
					continue;
				}

				let reqStart = time();
				let data = {}
				
				try {
					data = await myajax({
						url: `${HOSTADDRESS}/api/v2/voucher_wallet/save_voucher`,
						method: "POST",
						header: {
							"X-API-SOURCE": settings.platform,
							"X-CSRFToken": CSRF,
							"X-Requested-With": "XMLHttpRequest",
							"FH_Origin": HOSTADDRESS,
							"FH_Referer": `https://shopee.vn/m/${settings.campaign}`,
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
					saved: 0,
					itemStatus: item.name || item.code || "VC:" + item.id,
					itemStatusColor: ((reqTimeAT > 80) ? "yellow" : "green"),
					checkDetail: `Check ${checkNth}`
				})
	
				heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 80) ? "yellow" : "green") });

				if (data.error && data.error !== 0) {
					log(` + Code: ${data.error}`);
					log(` + MSG : ${data.error_msg || "Không rõ"}`);

					if (data.error !== 5)
						continue;
				}

				order();
				successCount++;
				heartbeat({ color: "green" });
				log(`✅ Thêm Thành Công`);
				firstScan.push(item.id);
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