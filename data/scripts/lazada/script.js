// Script begin here
(async () => {
    var infoUpdateInterval = null;
    var doCheck = true;
    var STEP_SLEEP = 200;
    var RETRY = 60

    var fetchBanned = false;

    onCancel(() => {
        clearInterval(infoUpdateInterval);
        doCheck = false;
    })

    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|      Lazada Auto v005     |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 23:15:44 21/10/2019  |`);
        log(`|===========================|`);
    
        const __fetchItemData = async () => {
            let html = await command("ajax", {
                url: this.page.url.href,
                maethod: "GET",
                type: "text"
            });

            let _doc = new DOMParser();
            let doc = _doc.parseFromString(html, "text/html");
            let errorLink = doc.getElementById("a-link")

            if (errorLink) {
                if (!fetchBanned)
                    chrome.windows.create({
                        url: errorLink.href,
                        width: 1100,
                        height: 600,
                        type: "panel",
                        setSelfAsOpener: true
                    });

                fetchBanned = true;
                throw { code: -1, description: "Hệ thống đã cấm lấy thông tin! Vui lòng thực hiện mở khóa bằng tay!" }
            }

            fetchBanned = false;
            let jsonText = doc.querySelector(`body > script[type="application/ld+json"]`);
            
            if (!jsonText)
                throw { code: -1, description: "Không tìm thấy thông tin item" }

            let json = JSON.parse(jsonText.innerText);
            json.offers.status = /(?:http|https)\:\/\/schema\.org\/(.+)$/gm
                .exec(json.offers.availability)[1];

            clog("DEBG", "Fetched Item Info:", json);
            return json;
        }

        // Get itemData
        var itemData = {};
        var itemName = "";
        var itemInitPrice = null;

        const fetchItemData = async () => {
            let data = await __fetchItemData();

            itemName = data.name;
            itemInitPrice = data.offers.price;

            info({
                id: data.sku,
                title: itemName,
                price: priceFormat(itemInitPrice),
                tags: [
                    `Status: ${data.offers.status}`,
                    `Seller: ${data.offers.seller.name}`,
                    `${data.offers.warranty["@type"]}: ${data.offers.warranty.durationOfWarranty.value}`
                ]
            })
        }
    
        try {
            itemData = await fetchItemData();
        } catch(e) {
            clog("errr", e);
            rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy!");
            return;
        }

        // Define
    
        log("Đã lấy thông tin Item");
        log("Đang chờ cài đặt từ người dùng");
        // Wait for settings
        const settings = await setup({
            preRunNote: { type: "note", level: "warning", text: `<b>Lưu Ý:</b> Lựa chọn loại hàng và số lượng trước khi chạy!` },
            orderByPrice: { type: "switch", label: "Mua theo giá sản phẩm", name: "orderBy", value: true },
            orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, required: true, depend: "orderBy:orderByPrice" },
            checkInterval: { type: "number", label: "Khoảng kiểm tra", value: 1000, required: true, depend: "orderBy:orderByPrice" },
            orderByTime: { type: "switch", label: "Mua theo thời gian", name: "orderBy" },
            orderDate: { type: "date", label: "Ngày mua", depend: "orderBy:orderByTime" },
            orderTime: { type: "time", label: "Giờ mua", depend: "orderBy:orderByTime" },
            timeCheckInterval: { type: "number", label: "Khoảng kiểm tra", depend: "orderBy:orderByTime", value: 60 },
            stepSleep: { type: "number", label: "STEP SLEEP", value: STEP_SLEEP },
            maxRetry: { type: "number", label: "RETRY", value: RETRY },
        });

        STEP_SLEEP = settings.stepSleep;
        RETRY = settings.maxRetry;
    
        log("CÀI ĐẶT:");

        for (let key of Object.keys(settings))
            log(` + ` + pleft(key, 18, true) + ` = ${settings[key]}`);

        log("Đang bắt đầu chạy...");
        run();
        
        // Start
        var checkNth = 0;
        var start = time();
        var checkPer = (settings.orderBy === "orderByTime") ? settings.timeCheckInterval : settings.checkInterval;

        switch (settings.orderBy) {

            //! |==========================|
			//! |      Order By Time       |
			//! |==========================|

            case "orderByTime":
                var end = time(new Date(`${settings.orderDate} ${settings.orderTime}`));
                log(`RUN: ${start} -> ${end}`);
    
                runInfo({
                    current: start,
                    target: end,
                    end: parseInt(end - start),
                    dataType: "time",
                    itemStatus: `Không Rõ`,
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
                        dataType: "time"
                    })
    
                    if (runTime <= 0) {
                        doCheck = false;
                        order();
            
                        await __doOrder();
            
                        complete();
                        runInfo({
                            itemStatus: `ĐÃ ĐẶT THÀNH CÔNG!`,
                            itemStatusColor: "green",
                            progress: 100,
                            progWarn: false,
                            checkDetail: "Đặt hàng thành công",
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
                break;
            
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
                        data = await __fetchItemData();
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
            
                    var currentPrice = data.offers.price;
                    let reqTime = ((time() - reqStart) * 1000);
                    let reqTimeAT = (reqTime / settings.checkInterval) * 100;
            
                    runInfo({
                        progress: reqTimeAT,
                        now: reqTime.toFixed(2) + "ms",
                        current:currentPrice ? currentPrice : "Không Rõ",
                        saved: ((currentPrice - itemInitPrice) / itemInitPrice) * 100,
                        itemStatus: (data.offers.status === "InStock") ? "CÓ HÀNG" : `KHÔNG CÒN HÀNG [${data.offers.status}]`,
                        itemStatusColor: (data.offers.status === "InStock") ? "green" : "red",
                        checkDetail: `Lần thử <b>${checkNth}</b>. Last request took <b>${reqTime.toFixed(2)}ms</b>`
                    })
    
                    heartbeat({ color: (reqTimeAT > 80) ? "red" : ((reqTimeAT > 50) ? "yellow" : "green") });
    
                    if (typeof currentPrice === "number" && currentPrice < settings.orderPrice && data.offers.status === "InStock") {
                        log(`NP: ${priceFormat(itemInitPrice)} -> ${priceFormat(currentPrice)}`);
                        doCheck = false;
                        order();
            
                        await __doOrder();
            
                        complete();
                        runInfo({
                            itemStatus: `ĐÃ ĐẶT THÀNH CÔNG!`,
                            itemStatusColor: "green",
                            progress: 100,
                            progWarn: false,
                            checkDetail: "Đặt hàng thành công"
                        });
                        log("CHẠY KẾT THÚC");
                        return;
                    }
                }
    
                infoUpdateInterval = setInterval(() => {
                    let runTime = time() - start;
                    runInfo({ time: runTime });
                }, 60)
                break;
        }
    
        const __checkHandler = async () => {
            if (!doCheck)
                return;
    
            let timeStart = time();
            await checker();
            setTimeout(() => __checkHandler(), checkPer - ((time() - timeStart) * 1000));
        }
        
        const __doOrder = async () => {
            let orderTimer = new stopClock();
            sounds.notification();

            log("Đang bắt đầu đặt mua Item");
            runInfo({ now: `Bước 1`, end: `Bước 4`, progress: 0, checkDetail: "Đang đặt mua Item" });
            heartbeat();
            
            log(" + Bắt đầu thêm vào Giỏ Hàng");
            await command("click", { query: "#module_add_to_cart > div > button.add-to-cart-buy-now-btn.pdp-button.pdp-button_type_text.pdp-button_theme_yellow.pdp-button_size_xl" })
            log(" + Thêm thành công!");

            log("Tiến hành thanh toán");
            runInfo({ now: `Bước 2`, progress: 30, progWarn: false, checkDetail: "Đang tiến hành thanh toán" });
            heartbeat();
            log(" + Đang thử nhấn nút thanh toán");

            await waitFor(
                async (tryNth) => {
                    heartbeat({ color: "blue" });
                    let _t = await command("click", { query: "#rightContainer_10010 > div.summary-section > div.summary-section-content > div > div.checkout-order-total > button" });
                    return (_t.clicked === true);
                },
                async () => {
                    log(" + Nhấn nút thanh toán Thành Công");

                    log("Đang chọn phương thức thanh toán");
                    runInfo({ now: `Bước 3`, progress: 60, progWarn: false, checkDetail: "Đang chọn phương thức thanh toán" });
                    heartbeat();
                    log(" + Chuyển phương thức thanh toán sang OTA");

                    await waitFor(
                        async (tryNth) => {
                            heartbeat({ color: "blue" });
                            let _t = await command("click", { query: "#automation-payment-method-item-127" });
                            return (_t.clicked === true);
                        },
                        async () => {
                            runInfo({ progress: 80, progWarn: false });
                            log(" + Đang xác nhận");

                            await waitFor(
                                async (tryNth) => {
                                    heartbeat({ color: "blue" });
                                    let _t = await command("click", { query: "#paymentMethodList_XxX10001 > div.pay-method-wrap-content.pay-method-wrap-content-border > div.btn-place-order-wrap > button" });
                                    return (_t.clicked === true);
                                },
                                async () => {
                                    log(" + Chọn phương thức thanh toán thành công!");
                                    runInfo({ now: `Bước 4`, progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công!" });
                                    
                                    heartbeat();
                                    log(" + doOrder đã hoàn thành!");
                                    log("=========== KẾT QUẢ ===========");
                                    log(` + Thời gian   : ${orderTimer.stop}s`);
                                },
                                RETRY,
                                STEP_SLEEP,
                                (tryNth) => errored(`waitFor failed after ${tryNth} retrys`)
                            );

                        },
                        RETRY,
                        STEP_SLEEP,
                        (tryNth) => errored(`waitFor failed after ${tryNth} retrys`)
                    );
                },
                RETRY,
                STEP_SLEEP,
                (tryNth) => errored(`waitFor failed after ${tryNth} retrys`)
            )

            log(" + doOrder đã hoàn thành!");
        }

        __checkHandler();
        log("Bắt đầu kiểm tra giá");
    } catch(e) {
        triggerError(e);
        return;
    }
})()