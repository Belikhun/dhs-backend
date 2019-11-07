// Script begin here
(async () => {
    var infoUpdateInterval = null;
    var doCheck = true;

    onCancel(() => {
        clearInterval(infoUpdateInterval);
        doCheck = false;
    })

    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|       Lazada Voucher      |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 23:04:27 06/11/2019  |`);
        log(`|===========================|`);

		info({ hide: true });
		
		// Scroll To Bottom To Load Content
		await command("eval", {
			script: `
				var scrollInterval = setInterval(e => {
					"window.scrollTo(0, document.body.scrollHeight);"
					
					
				})
			`
		});
		await delayAsync(1000);

		let selectedVoucherList = []
		let voucherListData = await command("eval", {
			script: `
				(function() {
					let voucherList = document.querySelectorAll(".voucher-item[data-voucherid][data-sellerid][data-spreadid]");
					let voucherData = {}
					let voucherSortedList = []
	
					for (let item of voucherList) {
						let data = {}

						try {
							data = {
								id: parseInt(item.dataset.voucherid),
								name: item.querySelector(".voucher-desc").innerText,
								value: parseInt(item.querySelector(".voucher-value").innerText.replace(/\\./g, "")),
								condition: item.querySelector(".voucher-condition p:nth-child(2)").innerText,
								soldout: item.dataset.soldout === "true" || item.dataset.status === "sold-out"
							}
						} catch(e) {
							console.error(e);
						} finally {
							voucherData[data.id] = data;
							voucherSortedList.push(data);
						}
					}
					
					voucherSortedList.sort((a, b) => (a.value < b.value) ? 1 : (a.value > b.value) ? -1 : 0);
					return {
						data: voucherData,
						sorted: voucherSortedList
					}
				}())
			`
		})

		let voucherList = voucherListData.result;
		
		if (voucherList.length === 0) {
			rejectSetup("Không tìm thấy voucher nào cả!");
			return;
		}

		let voucherSetupData = {
			note: { type: "note", level: "info", text: `<b style="font-size: 14px">LỰA CHỌN DANH SÁCH VOUCHER (${voucherList.sorted.length})</b>` }
		};

		for (let item of voucherList.sorted)
			voucherSetupData[item.id] = {
				type: "checkbox",
				label: `${item.name}<br><ul style="margin: 2px 0 0 0;"><li><font size="3">GIẢM <b>${priceFormat(item.value)}đ</b></font></li><li>Từ ${item.condition}</li></ul>`,
				color: item.soldout ? "pink" : "blue",
				value: false,
				disabled: item.soldout
			}

		const voucherSetup = await setup(voucherSetupData, { confirm: "Tiếp" });

		log("DANH SÁCH VOUCHER:");

		for (let key of Object.keys(voucherSetup)) {
			log(` + ` + pleft(key, 18, true) + ` = ${voucherSetup[key]}`);
			
			if (voucherSetup[key] === true)
				selectedVoucherList.push(voucherList.data[key]);
		}

		await delayAsync(500);
		
        log("Đang chờ cài đặt từ người dùng");
        // Wait for settings
        const settings = await setup({
			addDate: { type: "date", label: "Ngày thêm" },
			addTime: { type: "time", label: "Giờ thêm" },
            timeCheckInterval: { type: "number", label: "Khoảng kiểm tra", value: 60 },
            addDelay: { type: "number", label: "Thời gian chờ mỗi lần click", value: 100 }
        });
    
        log("CÀI ĐẶT:");

        for (let key of Object.keys(settings))
            log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

        log("Đang bắt đầu chạy...");
        run();
        
        // Start
        var checkNth = 0;
        var start = time();
        var checkPer = settings.timeCheckInterval;

		var end = time(new Date(`${settings.addDate} ${settings.addTime}`));
		log(`RUN: ${start} -> ${end}`);

		runInfo({
			current: start,
			target: end,
			end: parseInt(end - start),
			dataType: "time",
			itemStatus: `CHUẨN BỊ CLICK ${selectedVoucherList.length} VOUCHER`,
			itemStatusColor: "gray"
		});

		var checker = async () => {
			checkNth++;

			let curTime = time();
			let runTime = end - curTime;
			let progress = (curTime - start) / (end - start);
			
			runInfo({
				time: runTime,
				progress: progress * 100,
				saved: progress * 100,
				now: parseInt((end - start) - runTime),
				end: parseInt(end - start),
				dataType: "time"
			})

			if (runTime <= 0) {
				doCheck = false;
				order();

				let clicked = 0;
	
				for (let item of selectedVoucherList) {
					runInfo({
						dataType: "time",
						itemStatus: `ĐÃ CLICK ${clicked}/${selectedVoucherList.length} VOUCHER`,
						itemStatusColor: "yellow"
					});

					log(` + Đang click Voucher ${item.id}`);
					await command("click", { query: `.voucher-item[data-voucherid = "${item.id}"] .voucher-collect` });
					log(` + Click thành công!`);
					clicked++;

					log(` + Chờ ${settings.addDelay}ms`);
					await delayAsync(settings.addDelay);
				}
	
				complete();
				runInfo({
					itemStatus: `CLICK THÀNH CÔNG ${clicked}/${selectedVoucherList.length} VOUCHER`,
					itemStatusColor: "green",
					progress: 100,
					progWarn: false,
					checkDetail: "Click thành công",
					dataType: "time"
				});
				log("CHẠY KẾT THÚC");
				return;
			}
		}

		infoUpdateInterval = setInterval(() => {
			heartbeat({ color: "blue" });
			runInfo({ checkDetail: `TPS: ${checkNth}`, dataType: "time" });
			checkNth = 0;
		}, 1000)
    
        const __checkHandler = async () => {
            if (!doCheck)
                return;
    
            let timeStart = time();
            await checker();
            setTimeout(() => __checkHandler(), checkPer - ((time() - timeStart) * 1000));
        }

        __checkHandler();
        log("Bắt đầu kiểm tra giá");
    } catch(e) {
        triggerError(e);
        return;
    }
})()