// Script begin here
(async () => {
    var infoUpdateInterval = null;
    var doCheck = true;
    var STEP_SLEEP = 200;
    var RETRY = 60

    onCancel(() => {
        clearInterval(infoUpdateInterval);
        doCheck = false;
    })

    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|      Sendo Auto v005      |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 22:03:55 28/10/2019  |`);
        log(`|===========================|`);

        // Get itemName
        var itemName = "";
    
        try {
            itemName = (await command("queryText", { query: "div.productNameWrapper_2pqt > div > h1.productName_3Cdc" })).text;
        } catch(e) {
            rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(itemName not found)</i>");
            return;
        }
    
        log("itemName: " + itemName);
        info({ title: itemName });
        var itemInitPrice = 0;
    
        // Get ID
        var ITEMURL = null;
        var ID = null;
        var SHOPID = null;
        var HAVE_VARIATIONS = false;
        var PRODUCT_OPTIONS = {};
        var PRODUCT_HASH = null;
        var VARIANT_ID = [];
        var VARIANT_KEY = null;

        // Define

        const updateItemData = async () => {
            let data = await command("ajax", {
                url: `/m/wap_v2/full/san-pham/${ITEMURL}`,
                method: "GET"
            });

            heartbeat();
            let price = data.result.data.final_price;
            let stock = data.result.data.quantity;
            let modelName = [];

            if (HAVE_VARIATIONS && data.result.data.variants)
                for (let i = 0, m = data.result.data.variants; i < m.length; i++)
                    if (m[i].attribute_hash == VARIANT_ID.join("_")) {
                        VARIANT_KEY = i;
                        price = m[i].final_price;
                        stock = m[i].stock;
                        modelName = [`Model: ${m[i].sku_user}`];

                        break;
                    }

            itemInitPrice = price;
            ID = data.result.data.id;
            SHOPID = data.result.data.shop_info.shop_id;

            info({
                id: ID,
                price: priceFormat(itemInitPrice),
                tags: [
                    ...modelName,
                    `Shop ID: ${data.result.data.shop_info.shop_id}`,
                    `status: ${data.result.data.product_status}`,
                    `Còn lại: ${stock}`,
                    `freeShip: ${data.result.data.shop_free_shipping ? "Có" : "Không"}`,
                    `SKU: ${data.result.data.sku}`,
                    `Weight: ${data.result.data.weight}`
                ]
            })

            return data;
        }

        let regexResult = /(?:http|https):\/\/.+.sendo.vn\/(.+-(\d+))\.html/gm
            .exec(this.page.url.href);
    
        if (!regexResult) {
            rejectSetup("Hãy đi tới trang mặt hàng trước khi chạy! <i>(ID not found)</i>");
            return;
        }

        ITEMURL = regexResult[1];
        ID = parseInt(regexResult[2]);

        let itemData = await updateItemData();
        log("Đã lấy thông tin Item");

        log(`Item URL: ${ITEMURL}`);
        log(`Item ID : ${ID}`);
        log(`Shop ID : ${SHOPID}`);

        log("Đang chờ cài đặt từ người dùng");
        // Wait for variant settings
        if (itemData.result.data.attribute.length > 0) {
            log(" + Tìm thấy biến thể");
            HAVE_VARIATIONS = true;

            for (let attribute of itemData.result.data.attribute) {
                log(`   + Attribute ID: ${attribute.product_option}`);
                let optionList = [];
    
                for (let option of attribute.value)
                    optionList.push({ name: option.name || option.value, color: attribute.show_required ? "pink" : "blue", value: option.product_option_id });
    
                let optionValue = await setup({
                    option: {
                        type: "radio",
                        label: attribute.name + (attribute.show_required ? " (Bắt Buộc)" : ""),
                        required: attribute.show_required,
                        list: optionList
                    }
                }, { confirm: "Tiếp" });

                if (optionValue.option) {
                    log("     + Lựa chọn thiết lập: " + optionValue.option);
                    PRODUCT_OPTIONS[attribute.product_option] = [optionValue.option];

                    if (attribute.show_required) {
                        VARIANT_ID.push(parseInt(optionValue.option.split("_")[1]));
                        log("     + VARIANT ID: " + VARIANT_ID.join(", "));
                    }
                } else
                    log(`   + Bỏ qua thiết lập ${attribute.name}`);
    
                await delayAsync(500);
            }

            clog("DEBG", "Product Oprions:", PRODUCT_OPTIONS)
            await updateItemData();
        }
        
        // Wait for main settings
        const settings = await setup({
            orderByPrice: { type: "switch", label: "Mua theo giá sản phẩm", name: "orderBy", value: true },
            orderPrice: { type: "number", label: "Đặt khi giá nhỏ hơn", value: itemInitPrice, required: true, depend: "orderBy:orderByPrice" },
            orderCount: { type: "number", label: "Số lượng", value: 1, required: true, depend: "orderBy:orderByPrice" },
            orderDelay: { type: "number", label: "Thời gian chờ trước khi mua", value: 400, required: true, depend: "orderBy:orderByPrice" },
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
        
        // // Start
        // var checkNth = 0;
        // var start = time();
    
        // runInfo({
        //     target: settings.orderPrice
        // });
    
        

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
                        end: parseInt(end - start),
                        dataType: "time"
                    })
    
                    if (runTime <= 0) {
                        doCheck = false;
                        order();
            
                        await __doOrder({
                            shopId: SHOPID,
                            coupon: settings.coupon,
                            delay: 0
                        });
            
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
                        data = await command("ajax", {
                            url: `https://sendo.vn/m/wap_v2/full/san-pham/${ITEMURL}`,
                            method: "GET"
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
                            end: settings.checkInterval + "ms",
                            itemStatus: "LỖI ĐÃ XẢY RA",
                            itemStatusColor: "red",
                            checkDetail: "Một lỗi đã xảy ra trong quá trình kiểm tra giá Item"
                        });
        
                        return;
                    }
        
                    let price = data.result.data.final_price;
                    let stock = data.result.data.quantity;
        
                    if (HAVE_VARIATIONS && VARIANT_KEY) {
                        let i = data.result.data.variants[VARIANT_KEY];
                        price = i.final_price;
                        stock = i.stock;
                    }
            
                    var currentPrice = data.result.data ? price : null;
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
                        doCheck = false;
                        order();
        
                        await __doOrder({
                            shopId: SHOPID,
                            coupon: settings.coupon,
                            delay: settings.orderDelay
                        });
            
                        complete();
                        runInfo({
                            itemStatus: `Đặt thành công ${settings.orderCount} items`,
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

        const __preDoOrder = async ({
            id = 0,
            shopId = 0,
            count = 1,
            productOptions = {},
        }) => {
            log("Đang thêm Item vào Giỏ Hàng");
            runInfo({ now: `Bước 1`, end: `Bước 3`, progress: 0, checkDetail: "Đang thêm Item vào Giỏ Hàng" });
            heartbeat();
            let addCartData = null;

            try {
                addCartData = await command("ajax", {
                    url: "/m/wap_v2/cart/add",
                    method: "POST",
                    header: {
                        "x-requested-with": "XMLHttpRequest"
                    },
                    json: {
                        buynow: 1,
                        options: productOptions,
                        product_id: id,
                        qty: count,
                        shop_id: shopId,
                    }
                });
            } catch(e) {
                triggerError(e);
                throw e;
            }

            if (addCartData.result.data.data.error) {
                await errored("Lỗi Khi Thêm Item Vào Giỏ");
                log(" + Cannot Add Item Into Cart");
                log(`    + Code: ${addCartData.result.data.data.statusCode}`);
                log(`    + MSG : ${addCartData.result.data.data.message || "Không Rõ"}`);
                throw { code: -1, description: addCartData.result.data.data.message, data: addCartData };
            }
    
            if (addCartData.status.code !== 200) {
                await errored("Lỗi Khi Thêm Item Vào Giỏ");
                log(" + Cannot Add Item Into Cart");
                log(`    + Code: ${addCartData.status.code}`);
                log(`    + MSG : ${addCartData.status.message || "Không Rõ"}`);
                throw { code: -1, description: addCartData.status.message, data: addCartData };
            }

            log(` + Thêm Item vào Giỏ thành công!`);
            runInfo({ now: `Bước 2`, progress: 33, progWarn: false, checkDetail: "Lấy thông tin item" });
            heartbeat();
            
            log("Đang lấy thông tin Item");
            let itemData = {}

            log(" + Fetching /m/wap_v2/cart/list/travel");
            try {
                itemData = await command("ajax", {
                    url: `/m/wap_v2/cart/list/travel?v=1`,
                    method: "GET"
                });
            } catch(e) {
                triggerError(e);
                return;
            }

            runInfo({ now: `Bước 3`, progress: 66, progWarn: false, checkDetail: "Chuyển Tới Trang Thanh Toán" });
            heartbeat();
            log("Đang chuyển tới trang Thanh Toán");
            PRODUCT_HASH = itemData.result.data[0].product_list[0].data[0].hash;
            command("changeLocation", { href: `https://checkout.sendo.vn/?product=${PRODUCT_HASH}&sendo_platform=desktop2&shop=${shopId}` })
            
            log(" + Đang chờ trang tải xong");
            await waitFor(async (tryNth) => {
                heartbeat({ color: "blue" });
                let _t = await command("queryText", { query: "button.button_fKtq > span" });
                return (_t.text === "Đặt hàng");
            }, () => {}, RETRY, STEP_SLEEP,
                async (tryNth) => {
                    await errored("Lỗi khi chuyển sang trang Thanh Toán");
                    log(` + waitFor timed out after ${tryNth} retrys`);
                    log(`    + Code: -1`);
                    throw { code: -1, description: "waitFor Timed Out", data: { try: tryNth } };
                }
            );

            log(" + Đã tải xong");
            runInfo({ now: `Bước 3`, progress: 100, progWarn: false, checkDetail: "Đã chuyển tới trang thanh toán" });
        }
        
        const __doOrder = async ({
            shopId = 0,
            coupon = "",
            delay = 200
        }) => {
            sounds.notification();
            let orderTimer = new stopClock();
            heartbeat();
            let voucherJson = { "enable_suggest_voucher": true }

            // Set coupon preInit
            if (typeof coupon === "string" && coupon !== "") {
                runInfo({ now: `Bước 1`, end: `Bước 2`, progress: 0, progWarn: false, checkDetail: "Đang áp dụng mã giảm giá" });
                heartbeat();
                log(`Đang áp dụng Coupon: ${coupon}`);

                voucherJson = { voucher_code: coupon }
            }

            let info = await command("ajax", {
                url: "/api/checkout/info",
                method: "POST",
                json: {
                    "shop_id": shopId,
                    "product_hashes": [PRODUCT_HASH],
                    "sendo_platform": "desktop2",
                    "current_voucher": voucherJson,
                    "current_receive_email_info": {
                        "is_disable_suggest_email": false,
                        "receive_email": ""
                    },
                    "current_ticket_info": {
                        "is_validate_date": false,
                        "use_date": 0
                    },
                    "enable_tracking": true,
                    "ignore_invalid_product": -1,
                    "version": 2.2
                }
            })

            // Set coupon Check
            if (typeof coupon === "string" && coupon !== "") {
                runInfo({ progress: 75, progWarn: false });
                
                if (info.data.voucher_info.error) {
                    log(` + Mã giảm giá không hợp lệ`);
                    log(`    + MSG: ${info.data.voucher_info.error}`);
                    log(`    + Bỏ qua lỗi: true`);

                    info.data.voucher_info = { "enable_suggest_voucher": true };
                }

                log(` + Mã giảm giá hợp lệ`);
            }

            runInfo({ now: `Bước 2`, progress: 50, progWarn: false, checkDetail: "Đang đặt hàng" });
            heartbeat();
            log(`Bắt đầu đặt hàng`);
            log(` + Chờ ${delay}ms`);

            await delayAsync(delay);

            let placeOrder = await command("ajax", {
                url: "/api/checkout/save-order",
                method: "POST",
                header: {
                    "x-requested-with": "XMLHttpRequest"
                },
                json: {
                    current_address_id: info.data.customer_data.current_address_id,
                    current_carrier: info.data.shipping_info.current_carrier,
                    current_payment_method: info.data.payment_info.current_payment_data,
                    current_products: info.data.products_checkout.products,
                    current_voucher: info.data.voucher_info,
                    ignore_invalid_product: -1,
                    order_type: 1,
                    product_hashes: info.data.products_checkout.product_hashes,
                    sendo_platform: "desktop2",
                    shop_id: shopId,
                    version: 2.2
                }
            })

            if (placeOrder.is_error) {
                await errored("Lỗi Khi Tiến Hành Đặt Mua Item");
                log(" + Không thể tiến hành đặt mua");
                log(`    + Code: ${placeOrder.errors[0].code}`);
                log(`    + Type: ${placeOrder.errors[0].type}`);
                log(`    + MSG : ${placeOrder.errors[0].message || "Không rõ"}`);
                throw { code: placeOrder.error, description: `Lỗi Khi Tiến Hành Đặt Mua Item`, data: placeOrder };
            }

            heartbeat();
            runInfo({ now: `Bước 2`, progress: 100, progWarn: false, checkDetail: "Đặt hàng thành công" });
            log(" + doOrder đã hoàn thành! Đang chuyển tới chi tiết đơn...");
            log("=========== KẾT QUẢ ===========");
            log(` + CheckoutID  : ${placeOrder.increment_id}`);
            log(` + paymentType : ${placeOrder.payment_type}`);
            log(` + Thời gian   : ${orderTimer.stop}s`);

            command("changeLocation", { href: `https://profile.sendo.vn/chi-tiet-don-hang/${placeOrder.increment_id}` });
        }
    
        await __preDoOrder({
            id: ID,
            shopId: SHOPID,
            count: settings.orderCount,
            productOptions: PRODUCT_OPTIONS
        });

        __checkHandler();
        log("Bắt đầu kiểm tra giá");
    } catch(e) {
        triggerError(e);
        return;
    }
})()