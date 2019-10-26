// Script begin here
(async () => {
    var doCheck = true;
    var infoUpdateInterval = null;
    var timeUpdateInterval = null;

    const HOSTNAME = "https://tiki.vn/";
    const typeList = [
        "dien-thoai-may-tinh-bang/c1789",
        "dien-tu-dien-lanh/c4221",
        "thiet-bi-kts-phu-kien-so/c1815",
        "laptop-may-vi-tinh-linh-kien/c1846",
        "may-anh/c1801",
        "dien-gia-dung/c1882",
        "nha-cua-doi-song/c1883",
        "bach-hoa-online/c4384",
        "do-choi-me-be/c2549",
        "lam-dep-suc-khoe/c1520",
        "thoi-trang/c914",
        "the-thao-da-ngoai/c1975",
        "o-to-xe-may-xe-dap/c8594",
        "nha-sach-tiki/c8322",
        "hang-quoc-te/c17166"
    ]

    onCancel(() => {
        this.subScreen.hide();
        clearInterval(infoUpdateInterval);
        clearInterval(timeUpdateInterval);
        doCheck = false;
    })

    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|      Tiki Deal Hunter     |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 20:14:36 17/10/2019  |`);
        log(`|===========================|`);

        const scanItem = async (sortBy = "sale", pageCount = 1) => {
            let list = {}
            let sortedList = []

            heartbeat();
            log(` + Đang lấy danh sách item`);
            log(`   + sortBy    = ${sortBy}`);
            log(`   + pageCount = ${pageCount}`);
            log("");

            for (let item of typeList) {
                for (let page = 1; page <= pageCount; page++) {
                    let start = time();
                    heartbeat({ color: "yellow" });
                    log(`   + Đang tải (trang ${page}):`);
                    log(`     ${item}`);

                    let result = await myajax({
                        url: HOSTNAME + item,
                        method: "GET",
                        query: {
                            src: "mega-menu",
                            order: "discount_percent,desc",
                            page: page
                        },
                        type: "text"
                    });

                    heartbeat();
                    log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);
        
                    let itemPage = (new DOMParser()).parseFromString(result, "text/html");
                    let itemList = itemPage.querySelectorAll("div.product-item[data-id]");
    
                    for (let item of itemList) {
                        if (list[item.dataset.id])
                            continue;

                        let link = item.querySelector("a[data-id]").href;
                        let thumbnail = item.querySelector("a > div.content > span.image > img.product-image").src;
    
                        let price = parseInt(item.dataset.price);
                        let _priceBox = item.querySelector("a > div.content > p.price-sale > span.price-regular").innerText;
                        let oldPrice = (_priceBox !== "") ? parseInt(_priceBox.match(/\d/g).join("")) : price;
                        let priceSale = ((oldPrice - price) / oldPrice) * 100;
    
                        let couponBox = item.querySelector("a > div.price-tag-wrap > p.price-tag > span.tag > span.code");
                        let couponCode = null;
                        let couponPrice = null;
                        let couponSale = null;
    
                        if (couponBox) {
                            couponCode = couponBox.innerText;
                            couponPrice = parseInt(item.querySelector("a > div.price-tag-wrap > p.price-tag > span.price > span").innerText.match(/\d/g).join(""));
                            couponSale = ((oldPrice - couponPrice) / oldPrice) * 100;
                        }
    
                        list[item.dataset.id] = {
                            id: item.dataset.id,
                            title: item.dataset.title,
                            link: link,
                            price,
                            priceSale,
                            thumbnail,
                            oldPrice,
                            coupon: { code: couponCode, price: couponPrice, sale: couponSale },
                            sale: couponSale || priceSale
                        }
    
                        sortedList.push(list[item.dataset.id]);
                    }
                }
            }

            log(`   + Lấy danh sách thành công`);
            heartbeat();
            log(`   + Đang sắp xếp dữ liệu`);

            switch (sortBy) {
                case "sale":
                    sortedList.sort((a, b) => (a.sale < b.sale) ? 1 : (a.sale > b.sale) ? -1 : 0);
                    break;
            
                case "name":
                    sortedList.sort((a, b) => (a.title < b.title) ? 1 : (a.title > b.title) ? -1 : 0);
                    break;

                case "haveCoupon":
                    sortedList.sort((a, b) => a.coupon.code ? -1 : 1);
                    break;

                case "priceUp":
                    sortedList.sort((a, b) => (a.price < b.price) ? -1 : (a.price > b.price) ? 1 : 0);
                    break;

                case "priceDown":
                    sortedList.sort((a, b) => (a.price < b.price) ? 1 : (a.title > b.price) ? -1 : 0);
                    break;

                default:
                    break;
            }

            log(`   + Sắp xếp dữ liệu thành công!`);
            return { list, sortedList }
        }

        const createItemBox = (itemData) => {
            let box = document.createElement("div");
            box.classList.add("item");
            box.dataset.soundhover = "";
            sounds.applySound(box);

            let name = document.createElement("a");
            name.classList.add("name");
            name.innerText = itemData.title;
            name.href = itemData.link;
            name.target = "_blank";
            name.dataset.soundselect = "";
            sounds.applySound(name);
            box.appendChild(name);

            let priceInfo = document.createElement("span");
            priceInfo.classList.add("priceInfo");
            
            let currentPrice = document.createElement("t");
            currentPrice.classList.add("current", "price");
            currentPrice.innerText = priceFormat(itemData.price);

            let oldPrice = document.createElement("t");
            oldPrice.classList.add("old", "price");
            oldPrice.innerText = priceFormat(itemData.oldPrice);

            let discount = document.createElement("t");
            discount.classList.add("discount");
            discount.innerText = `${(-itemData.priceSale).toFixed(2)}%`;

            if (itemData.coupon.code) {
                let couponContainer = document.createElement("div");
                couponContainer.classList.add("coupon");
    
                let couponContainerCode = document.createElement("t");
                couponContainerCode.classList.add("code");
                couponContainerCode.innerText = itemData.coupon.code;
    
                let couponContainerPrice = document.createElement("span");
                couponContainerPrice.classList.add("price");
                couponContainerPrice.innerText = priceFormat(itemData.coupon.price);

                let couponContainerSale = document.createElement("t");
                couponContainerSale.classList.add("sale");
                couponContainerSale.innerText = `${-(itemData.coupon.sale).toFixed(2)}%`;

                couponContainer.append(couponContainerCode, couponContainerPrice, couponContainerSale);
                box.appendChild(couponContainer);
            }

            priceInfo.append(currentPrice, oldPrice, discount);
            box.appendChild(priceInfo);

            return box;
        }

        //<span class="item">
        //    <div class="lazyload thumbnail">
        //        <img onload="this.parentNode.dataset.loaded = 1" src="https://salt.tikicdn.com/cache/75x75/ts/product/93/f7/42/2192f6f689d7f5714264228c0fbcdc49.jpg"/>
        //        <div class="simple-spinner"></div>
        //    </div>
        //    <div class="info">
        //        <t class="name">Tai nghe cho iphone 5/5s/6/6s/6sPlus</t>
        //        <span class="priceInfo">
        //            <t class="current price">1000.000</t>
        //            <t class="old price">1000.000</t>
        //            <t class="discount">-100%</t>
        //        </span>
        //    </div>
        //</span>
        
        const createChangedItemBox = (itemData) => {
            let box = document.createElement("div");
            box.classList.add("item");
            box.dataset.soundhover = "";
            sounds.applySound(box);

            let thumbnail = document.createElement("div");
            thumbnail.classList.add("lazyload", "thumbnail");

            let thumbnailImage = document.createElement("img");
            thumbnailImage.onload = (e) => e.target.parentElement.dataset.loaded = 1;
            thumbnailImage.src = itemData.thumbnail;

            let thumbnailSpinner = document.createElement("div");
            thumbnailSpinner.classList.add("simple-spinner");

            thumbnail.append(thumbnailImage, thumbnailSpinner);

            let infoBox = document.createElement("div");
            infoBox.classList.add("info");

            let name = document.createElement("a");
            name.classList.add("name");
            name.innerText = itemData.title;
            name.href = itemData.link;
            name.target = "_blank";
            name.dataset.soundselect = "";
            sounds.applySound(name);
            infoBox.appendChild(name);

            let priceInfo = document.createElement("span");
            priceInfo.classList.add("priceInfo");
            
            let currentPrice = document.createElement("t");
            currentPrice.classList.add("current", "price");
            currentPrice.innerText = priceFormat(itemData.price);

            let oldPrice = document.createElement("t");
            oldPrice.classList.add("old", "price");
            oldPrice.innerText = priceFormat(itemData.oldPrice);

            let discount = document.createElement("t");
            discount.classList.add("discount");
            discount.innerText = `${(-itemData.priceSale).toFixed(2)}%`;

            if (itemData.coupon.code) {
                let couponContainer = document.createElement("div");
                couponContainer.classList.add("coupon");
    
                let couponContainerCode = document.createElement("t");
                couponContainerCode.classList.add("code");
                couponContainerCode.innerText = itemData.coupon.code;
    
                let couponContainerPrice = document.createElement("span");
                couponContainerPrice.classList.add("price");
                couponContainerPrice.innerText = priceFormat(itemData.coupon.price);

                let couponContainerSale = document.createElement("t");
                couponContainerSale.classList.add("sale");
                couponContainerSale.innerText = `${-(itemData.coupon.sale).toFixed(2)}%`;

                couponContainer.append(couponContainerCode, couponContainerPrice, couponContainerSale);
                infoBox.appendChild(couponContainer);
            }

            priceInfo.append(currentPrice, oldPrice, discount);
            infoBox.appendChild(priceInfo);
            box.append(thumbnail, infoBox);

            return box;
        }

        //* START HERE

        await info({ hide: true });

        // Container Element Init
        let container = document.createElement("div");

        let title = document.createElement("t");
        title.classList.add("title");
        title.innerText = "Danh sách Item";
        container.appendChild(title);

        //? Changed List Box
        let changedList = document.createElement("div");
        changedList.classList.add("container", "changed");

        let changedListHeader = document.createElement("div");
        changedListHeader.classList.add("header");

        let changedListHeaderInfo = document.createElement("span");
        changedListHeaderInfo.classList.add("info");
        changedListHeaderInfo.innerText = "Đã Bị Thay Đổi";

        changedListHeader.append(changedListHeaderInfo);

        var changedListItem = document.createElement("div");
        changedListItem.classList.add("itemList");

        changedList.append(changedListHeader, changedListItem);
        container.appendChild(changedList);

        //? All List Box
        let allList = document.createElement("div");
        allList.classList.add("container", "allList");
        
        let allListHeader = document.createElement("div");
        allListHeader.classList.add("header");

        let allListHeaderInfo = document.createElement("span");
        allListHeaderInfo.classList.add("info");
        allListHeaderInfo.innerText = "Toàn Bộ";

        let allListHeaderPage = document.createElement("span");
        allListHeaderPage.classList.add("pageChange");

        var allListHeaderPageNext = document.createElement("span");
        allListHeaderPageNext.classList.add("next");
        allListHeaderPageNext.dataset.soundhover = "";
        allListHeaderPageNext.dataset.soundselect = "";
        sounds.applySound(allListHeaderPageNext);

        var allListHeaderPageCurrent = document.createElement("t");
        allListHeaderPageCurrent.classList.add("current");

        var allListHeaderPagePrev = document.createElement("span");
        allListHeaderPagePrev.classList.add("prev");
        allListHeaderPagePrev.dataset.soundhover = "";
        allListHeaderPagePrev.dataset.soundselect = "";
        sounds.applySound(allListHeaderPagePrev);

        allListHeaderPage.append(allListHeaderPagePrev, allListHeaderPageCurrent, allListHeaderPageNext);
        allListHeader.append(allListHeaderInfo, allListHeaderPage);

        var allListItem = document.createElement("div");
        allListItem.classList.add("itemList");

        allList.append(allListHeader, allListItem);
        container.appendChild(allList);

        this.subScreen.show(container, "dealHunt");

        var firstScanSetup = await setup({
            sortBy: {
				type: "radio",
				label: "Sắp xếp theo",
				required: false,
				list: [
                    { name: `Tên`, color: "blue", value: "name" },
                    { name: `Mức giảm giá`, color: "pink", value: "sale", checked: true },
                    { name: `Có mã giảm giá`, color: "blue", value: "haveCoupon" },
                    { name: `Giá item (nhỏ đến lớn)`, color: "blue", value: "priceUp" },
                    { name: `Giá item (lớn đến nhỏ)`, color: "blue", value: "priceDown" }
                ]
            },
            scanPage: { type: "number", label: "Số Trang Quét Mỗi Loại", value: 1 }
        }, { confirm: "Tiếp" })

        // Start Scanning Item
        var itemList = await scanItem(firstScanSetup.sortBy, firstScanSetup.scanPage);
        var CURRENT_PAGE = 1;

        const changeAllListPage = (page, {
            showCount = 10
        } = {}) => {
            let total = itemList.sortedList.length;
            let maxPage = (showCount === 0) ? 1 : Math.floor(total / showCount);
            let from = Math.max((page - 1) * showCount, 0);
            let to = Math.min(page * showCount, total - 1);

            if (page > maxPage || page < 1)
                return;

            allListItem.innerHTML = "";
            
            for (let i = from; i < to; i++) {
                allListItem.appendChild(createItemBox(itemList.sortedList[i]));
                allListHeaderPageCurrent.innerText = `${from + 1}-${to + 1} ${page}/${maxPage}`;
            }

            CURRENT_PAGE = page;
        }

        allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
        allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
        changeAllListPage(CURRENT_PAGE);

        const settings = await setup({
            delay: { type: "number", label: "Thời Gian Nghỉ", value: 10 }
        })

        log("Đang bắt đầu chạy...");
        run();
        
        // Start
        var runNth = 1;
        var checkNth = 0;
        var checkPer = 60;
        var startTime = time();
        var start = time();
        var end = start + settings.delay;

        var checker = async () => {
            checkNth++;

            let curTime = time();
            let runTime = end - curTime;
            let progress = (curTime - start) / (end - start);
            
            runInfo({
                current: runTime.toFixed(2),
                target: "0.00",
                progress: progress * 100,
                now: parseInt((end - start) - runTime),
                end: parseInt(end - start),
                saved: progress * 100,
                itemStatus: `Chạy lần ${runNth}`,
                itemStatusColor: "green",
                dataType: "time"
            })

            if (runTime <= 0) {
                let startCheck = time();
                log(`Bắt đầu kiểm tra (lần ${runNth})`);
                await __doUpdate();
                log(` + KIỂM TRA HOÀN THÀNH`);
                log(` + Thời gian: ${(time() - startCheck).toFixed(2)}s`);

                // Reset
                runNth++;
                start = time();
                end = start + settings.delay;
            }
        }

        infoUpdateInterval = setInterval(() => {
            heartbeat({ color: "blue" });
            runInfo({ checkDetail: `TPS: ${checkNth}`, dataType: "time" });
            checkNth = 0;
        }, 1000)

        timeUpdateInterval = setInterval(() => {
            runInfo({
                time: time() - startTime,
                dataType: "time"
            })
        }, checkPer);

        const __checkHandler = async () => {
            if (!doCheck)
                return;
    
            let timeStart = time();
            await checker();
            setTimeout(() => __checkHandler(), checkPer - ((time() - timeStart) * 1000));
        }

        const __doUpdate = async () => {
            runInfo({ now: `Bước 1`, end: `Bước 2`, progress: 0, checkDetail: "Đang Lấy Danh Sách Item" });
            let list = await scanItem(firstScanSetup.sortBy, firstScanSetup.scanPage);
            runInfo({ now: `Bước 2`, progress: 50, progWarn: false, checkDetail: "Đang So Sánh Thông Tin" });
            let changed = 0;
            let changedList = []

            for (let item of list.sortedList)
                if (!itemList.list[item.id] || itemList.list[item.id].price > item.price || itemList.list[item.id].sale < item.sale) {
                    changed++;

                    if (itemList.list[item.id]) {
                        log(` + Tìm thấy Item bị thay đổi: ${item.id} [${changed}]`);
                        log(`   + GIÁ:  ${itemList.list[item.id].price} -> ${item.price}`);
                        log(`   + SALE: ${itemList.list[item.id].sale.toFixed(2)}% -> ${item.sale.toFixed(2)}%`);
                    } else {
                        log(` + Tìm thấy Item mới: ${item.id} [${changed}]`);
                        log(`   + GIÁ:  ${item.price}`);
                        log(`   + SALE: ${item.sale.toFixed(2)}%`);
                    }

                    sounds.notification();
                    changedListItem.appendChild(createChangedItemBox(item));
                    changedList.push({ title: item.title, message: item.id + "" });
                    itemList.list[item.id] = item;
                }

            if (changed > 0)
                chrome.notifications.create({
                    type: "list",
                    title: "Deal Hunter Suite",
                    message: `Đã tìm thấy ${changed} item thay đổi giá`,
                    contextMessage: `${(time() - start).toFixed(2)}s`,
                    iconUrl: "/assets/img/icon@32x32.png",
                    items: changedList,
                    requireInteraction: true
                });

            runInfo({ now: `Bước 2`, progress: 100, progWarn: false, checkDetail: "Thành Công" });
        }

        __checkHandler();
        log("Bắt đầu chạy");
    } catch(e) {
        triggerError(e);
        return;
    }
})()