// Script begin here
(async () => {
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
        
    })

    const log = (text) => writeLog(text);

    try {
        log(`|===========================|`);
        log(`|      Tiki Deal Hunter     |`);
        log(`|          Belikhun         |`);
        log(`|  LU: 20:14:36 17/10/2019  |`);
        log(`|===========================|`);

        await info({ hide: true });

        await setup({
            delay: { type: "number", label: "Thời Gian Nghỉ", value: 10000 },
            scanPage: { type: "number", label: "Số Trang Quét Mỗi Loại", value: 1 }
        })

        for (let item of typeList) {
            let result = await myajax({
                url: HOSTNAME + item,
                method: "GET",
                query: {
                    src: "mega-menu",
                    order: "discount_percent,desc",
                    page: 1
                },
                type: "text"
            })

            let itemPage = (new DOMParser()).parseFromString(result, "text/html");
            let itemList = itemPage.querySelectorAll("div.product-item[data-id]");
        }

    } catch(e) {
        triggerError(e);
        return;
    }
})()