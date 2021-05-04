// Script begin here
(async () => {
	var doCheck = true;
	var infoUpdateInterval = null;
	var timeUpdateInterval = null;

	const HOSTADDRESS = "https://www.bachhoaxanh.com";
	var selectedPageList = []
	const pageList = {
		bia: {title: "Bia, nước uống có cồn", path: "/bia", id: 2282},
		nuocngot: {title: "Nước ngọt, giải khát", path: "/nuoc-ngot", id: 2443},
		nuocsuoikhoang: {title: "Nước suối, nước khoáng", path: "/nuoc-suoi-khoang", id: 2563},
		nuoceptraicay: {title: "Nước ép trái cây", path: "/nuoc-ep-trai-cay", id: 3265},
		nuocyen: {title: "Nước yến", path: "/nuoc-yen", id: 4585},
		caphetra: {title: "Cà phê, trà", path: "/ca-phe-tra", id: 7519},
		suatraicay: {title: "Sữa trái cây", path: "/sua-trai-cay", id: 2947},
		matong: {title: "Mật ong", path: "/mat-ong", id: 7068},
		traicaydonghopsiro: {title: "Trái cây hộp, siro", path: "/trai-cay-dong-hop-si-ro", id: 8260},
		nghevien: {title: "Tinh bột nghệ, nghệ viên", path: "/nghe-vien", id: 7100},
		suatuoi: {title: "Sữa tươi", path: "/sua-tuoi", id: 2386},
		suatuhat: {title: "Sữa đậu nành, sữa từ hạt", path: "/sua-tu-hat", id: 2943},
		suadac: {title: "Sữa đặc", path: "/sua-dac", id: 2526},
		suasuacacaoyenmachngucoc: {title: "Sữa ca cao, yến mạch, ngũ cốc", path: "/sua-sua-ca-cao-yen-mach-ngu-coc", id: 8287},
		suabotandam: {title: "Sữa bột, sữa bột pha sẵn", path: "/sua-bot-an-dam", id: 7307},
		botandam: {title: "Bột ăn dặm", path: "/bot-an-dam", id: 2605},
		suachuaphomai: {title: "Sữa chua, phô mai", path: "/sua-chua-pho-mai", id: 7538},
		tabim: {title: "Tã bỉm", path: "/ta-bim", id: 2427},
		mi: {title: "Mì ăn liền", path: "/mi", id: 2565},
		chaoanlien: {title: "Cháo ăn liền", path: "/chao-an-lien", id: 2564},
		bunphohutieumienanlien: {title: "Bún, phở, hủ tiếu, miến ăn liền", path: "/bun-pho-hu-tieu-mien-an-lien", id: 8261},
		tokbokki: {title: "Bánh gạo (Tokbokki)", path: "/tokbokki", id: 7162},
		canhanlien: {title: "Canh ăn liền", path: "/canh-an-lien", id: 7167},
		dauan: {title: "Dầu ăn", path: "/dau-an", id: 2286},
		nuoctuong: {title: "Nước tương", path: "/nuoc-tuong", id: 2683},
		nuocmam: {title: "Nước mắm", path: "/nuoc-mam", id: 2289},
		tuongotcaden: {title: "Tương ớt, tương cà, tương đen", path: "/tuong-ot-ca-den", id: 2567},
		giavinem: {title: "Gia vị nêm", path: "/gia-vi-nem", id: 8263 },
		giavitamuop: {title: "Gia vị tẩm ướp", path: "/gia-vi-tam-uop", id: 8272 },
		bosotmayonnaise: {title: "Bơ, sốt mayonnaise", path: "/bo-sot-mayonnaise", id: 8277},
		nuocchammutatmamcacloai: {title: "Nước chấm, mù tạt, mắm các loại", path: "/nuoc-cham-mu-tat-mam-cac-loai", id: 8278},
		snack: {title: "Snack", path: "/snack", id: 3364},
		banhquybanhtrung: {title: "Bánh quy, bánh trứng", path: "/banh-quy-banh-trung", id: 7638},
		banhbonglan: {title: "Bánh bông lan, donut", path: "/banh-bong-lan", id: 3358},
		banhxopbanhgao: {title: "Bánh xốp, bánh gạo", path: "/banh-xop-banh-gao", id: 7363},
		banhquebanhque: {title: "Bánh que, bánh quế", path: "/banh-que-banh-que", id: 7364},
		socolacacloai: {title: "Socola", path: "/socola-cac-loai", id: 7365},
		keocacloai: {title: "Kẹo các loại", path: "/keo-cac-loai", id: 7361},
		muthattraicaysay: {title: "Mứt, hạt, trái cây sấy các loại", path: "/mut-hat-trai-cay-say", id: 7338},
		khoanlien: {title: "Khô ăn liền", path: "/kho-an-lien", id: 7366},
		daugoidauxaduongtoc: {title: "Dầu gội, dầu xả, dưỡng tóc", path: "/dau-goi-dau-xa-duong-toc", id: 7140},
		suatamxaphong: {title: "Sữa tắm, xà phòng", path: "/sua-tam-xa-phong", id: 8265},
		duongthe: {title: "Sữa dưỡng thể", path: "/duong-the", id: 3104},
		nuocruatay: {title: "Nước rửa tay", path: "/nuoc-rua-tay", id: 2486},
		bangvesinhdungdichvesinh: {title: "Băng vệ sinh, dung dịch vệ sinh", path: "/bang-ve-sinh-dung-dich-ve-sinh", id: 8266},
		lanxitkhumui: {title: "Lăn xịt khử mùi", path: "/lan-xit-khu-mui", id: 2507},
		khangiaykhangiayuot: {title: "Khăn giấy, khăn giấy ướt", path: "/khan-giay-khan-giay-uot", id: 8267},
		chamsocrangmieng: {title: "Chăm sóc răng miệng", path: "/cham-soc-rang-mieng", id: 8268},
		chamsocdamat: {title: "Chăm sóc da mặt", path: "/cham-soc-da-mat", id: 8269},
		baocaosu: {title: "Bao cao su, gel bôi trơn", path: "/bao-cao-su", id: 2519},
		chamsoccanhankhac: {title: "Chăm sóc cá nhân khác", path: "/cham-soc-ca-nhan-khac", id: 7322},
		nuocgiatbotgiat: {title: "Nước giặt, bột giặt, nước tẩy", path: "/nuoc-giat-bot-giat", id: 7153},
		nuocxa: {title: "Nước xả vải", path: "/nuoc-xa", id: 2465},
		tayruaboncaunhatam: {title: "Tẩy rửa bồn cầu, nhà tắm", path: "/tay-rua-bon-cau-nha-tam", id: 2511},
		nuocruachen: {title: "Nước rửa chén", path: "/nuoc-rua-chen", id: 2387},
		nuoclausanlaubeplaukinh: {title: "Nước lau sàn, lau bếp, lau kính", path: "/nuoc-lau-san-lau-bep-lau-kinh", id: 7319},
		vesinhnhacuakhac: {title: "Xịt phòng, sáp thơm, túi thơm", path: "/ve-sinh-nha-cua-khac", id: 7155},
		dietcontrung: {title: "Diệt côn trùng", path: "/diet-con-trung", id: 2530},
		noichao: {title: "Nồi, chảo", path: "/noi-chao", id: 8398},
		tochenly: {title: "Tô, chén, ly", path: "/to-chen-ly", id: 6032},
		duamuong: {title: "Đũa, muỗng", path: "/dua-muong", id: 8258},
		daokeothot: {title: "Dao, kéo, thớt", path: "/dao-keo-thot", id: 8259},
		dodungnhabep: {title: "Đồ dùng nhà bếp", path: "/do-dung-nha-bep", id: 8264},
		dodunggiadinhkhac: {title: "Đồ dùng gia đình khác", path: "/do-dung-gia-dinh-khac", id: 7449},
		gaogaonep: {title: "Gạo", path: "/gao-gao-nep", id: 2513},
		botngucoc: {title: "Ngũ cốc, yến mạch", path: "/bot-ngu-coc", id: 2903},
		minuibunkho: {title: "Mì, nui, bún khô...", path: "/mi-nui-bun-kho", id: 7316},
		rongbien: {title: "Rong biển, tảo biển", path: "/rong-bien", id: 7083},
		nuoccotdua: {title: "Nước cốt dừa", path: "/nuoc-cot-dua", id: 7086},
		banhtrangbanhphong: {title: "Bánh tráng, bánh phồng", path: "/banh-trang-banh-phong", id: 8283},
		dokho: {title: "Đồ khô", path: "/do-kho", id: 8284},
		thucphamchay: {title: "Thực phẩm chay", path: "/thuc-pham-chay", id: 7082},
		dodonghop: {title: "Đồ đóng hộp", path: "/do-dong-hop", id: 7320},
		botchebiensan: {title: "Bột làm bánh, bột chiên", path: "/bot-che-bien-san", id: 2388},
		suachuaan: {title: "Sữa chua ăn", path: "/sua-chua-an", id: 7558},
		traicay: {title: "Trái cây nhập khẩu", path: "/trai-cay", id: 7578},
		xucxichtuoi: {title: "Xúc xích", path: "/xuc-xich-tuoi", id: 7618},
		chagio: {title: "Chả giò, chả ram", path: "/cha-gio", id: 7171},
		cavienbovien: {title: "Cá viên, bò viên, chả cá", path: "/ca-vien-bo-vien", id: 7170},
		thucphamdonglanhchebiensan: {title: "Đồ chua, dưa muối", path: "/thuc-pham-dong-lanh-che-bien-san", id: 7459},
		haisandonglanh: {title: "Thịt, hải sản, rau củ đông lạnh", path: "/hai-san-dong-lanh", id: 7172},
		dodonglanhkhac: {title: "Đồ đông lạnh khác", path: "/do-dong-lanh-khac", id: 8358}
	}

	onCancel(() => {
		this.subScreen.hide();
		clearInterval(infoUpdateInterval);
		clearInterval(timeUpdateInterval);
		doCheck = false;
	})

	const log = (text) => writeLog(text);

	try {
		log(`|===========================|`);
		log(`| Bách Hóa Xanh Deal Hunter |`);
		log(`|          Belikhun         |`);
		log(`|  LU: 00:13:27 18/03/2020  |`);
		log(`|===========================|`);

		const getBlackList = async () => Object.keys(await this.dataLoad("bhsHuntBlackList") || {}).map(i => parseInt(i));

		const saveBlackList = async (list) => {
			let listObj = {}
			for (let i of list)
				if (!isNaN(i) && i !== "")
					listObj[i] = true;

			await this.dataSave({ bhsHuntBlackList: listObj });
		}

		const scanItem = async ({
			sortBy = "sale",
			pageCount = 1,
			listLimit = 16,
			provinceID = 8,
			saleFilter = 0,
			doSort = true,
			itemHandler = () => {}
		} = {}, set = () => {}) => {
			let list = {}
			let sortedList = []
			let blackList = await getBlackList();

			heartbeat();
			log(` + Đang lấy danh sách item`);
			log(`   + sortBy    = ${sortBy}`);
			log(`   + pageCount = ${pageCount}`);

			for (let itemNth = 0; itemNth < selectedPageList.length; itemNth++) {
				let item = selectedPageList[itemNth];
				let start = time();

				log(`   + Đang tải: ${item.title}`);
				
				for (let page = 1; page <= pageCount; page++) {
					var result = {}
					heartbeat({ color: "yellow" });

					try {
						result = await myajax({
							url: HOSTADDRESS + "/aj/Group/AjaxProducts",
							method: "POST",
							header: {
								"X-Requested-With": "XMLHttpRequest"
							},
							query: {
								t: time()
							},
							form: {
								"frm.Info.Id": item.id,
								"frm.CateListFilter": "",
								"frm.SelectedBrands.Id": 0,
								"frm.PropertyIdList": "",
								"frm.Query.Paging.PageIndex": page,
								"frm.Query.Sort": "PromotionDesc",
								"frm.Query.Paging.PageSize": listLimit,
								"frm.IsPromotion": "False",
								"frm.IsMainCate": "False",
								"frm.IsLeaf": "False",
								"frm.Query.ProvinceId": provinceID,
								"frm.IsLoadVideo": "False"
							}
						});
					} catch(e) {
						heartbeat({ color: "red" });
						log(" + Lỗi đã xảy ra khi lấy danh sách Item");
						log(`    + Code: ${e.code}`);
						log(`    + MSG : ${e.description || "Không Rõ"}`);
						log(`    + Bỏ qua lỗi: true`);

						continue;
					}

					// Calc progress
					let now = (itemNth * pageCount + page);
					let end = pageCount * selectedPageList.length;
					set((now / end) * 100, now, end);
					delete now;
					delete end;
					heartbeat();
		
					let itemPage = (new DOMParser()).parseFromString(JSON.parse(result.Msg).html, "text/html");
					let itemList = itemPage.querySelectorAll("li.product[data-product]");

					for (let item of itemList) {
						if (list[item.dataset.product] || blackList.indexOf(item.dataset.product) !== -1)
							continue;

						let link = HOSTADDRESS + item.querySelector("a[href]").href;
						let thumbnail = item.querySelector("a > div.boximg > img").src;
						let title = item.querySelector("a > div.product-name").innerText;
	
						let _priceBox = item.querySelector("a > div.price > strong").innerText;
						let price = (_priceBox !== "") ? parseInt(_priceBox.match(/\d/g).join("")) : 0;
						let _oldPriceBox = item.querySelector("a > div.price > span");
						let oldPrice = (_oldPriceBox) ? parseInt(_oldPriceBox.innerText.match(/\d/g).join("")) : price;
						let priceSale = ((oldPrice - price) / Math.max(oldPrice, 1)) * 100;
	
						if (priceSale < saleFilter)
							continue;
	
						list[item.dataset.product] = {
							id: item.dataset.product,
							sku: item.dataset.sku,
							title,
							link,
							price,
							priceSale,
							thumbnail,
							oldPrice,
							sale: priceSale
						}

						// Item Handling Function
						await itemHandler(list[item.dataset.product]);
	
						if (doSort)
							sortedList.push(list[item.dataset.product]);
					}

					delete result;
				}
				
				log(`     + Thời gian: ${(time() - start).toFixed(2)}s`);
			}

			log(`   + Lấy danh sách thành công`);

			if (doSort) {
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
						sortedList.sort((a, b) => (a.price < b.price) ? 1 : (a.price > b.price) ? -1 : 0);
						break;
	
					default:
						break;
				}
	
				log(`   + Sắp xếp dữ liệu thành công!`);
			}

			return { list, sortedList }
		}

		const createItemBox = (itemData, onBlacklist = () => {}) => {
			let box = document.createElement("div");
			box.classList.add("item");
			box.setAttribute("item-id", itemData.id);
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

			let blackList = document.createElement("span");
			blackList.classList.add("blackList");
			blackList.setAttribute("item-id", itemData.id);
			blackList.dataset.soundhoversoft = "";
			blackList.dataset.soundselectsoft = "";
			sounds.applySound(blackList);
			blackList.addEventListener("click", e => onBlacklist(e));

			priceInfo.append(currentPrice, oldPrice, discount);
			box.append(priceInfo, blackList);

			return box;
		}
		
		const createChangedItemBox = (itemData, onBlacklist = () => {}) => {
			let box = document.createElement("div");
			box.classList.add("item");
			box.setAttribute("item-id", itemData.id);
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

			let blackList = document.createElement("span");
			blackList.classList.add("blackList");
			blackList.setAttribute("item-id", itemData.id);
			blackList.dataset.soundhoversoft = "";
			blackList.dataset.soundselectsoft = "";
			sounds.applySound(blackList);
			blackList.addEventListener("click", e => onBlacklist(e));

			priceInfo.append(currentPrice, oldPrice, discount);
			infoBox.append(priceInfo, blackList);
			box.append(thumbnail, infoBox);

			return box;
		}

		const deleteNode = (node) => node.parentElement.removeChild(node);

		//* ==============
		//*   START HERE
		//* ==============

		await info({ hide: true });

		// Container Element Init
		let container = document.createElement("div");

		//? Changed List Box
		let changedList = document.createElement("div");
		changedList.classList.add("container", "changed");

		let changedListHeader = document.createElement("div");
		changedListHeader.classList.add("header");

		let changedListHeaderInfo = document.createElement("span");
		changedListHeaderInfo.classList.add("info");
		changedListHeaderInfo.innerText = "Đã Bị Thay Đổi";

		let changedListHeaderPage = document.createElement("span");
		changedListHeaderPage.classList.add("buttonBox");

		var changedListHeaderPageDelete = document.createElement("span");
		changedListHeaderPageDelete.classList.add("delete");
		changedListHeaderPageDelete.dataset.soundhover = "";
		changedListHeaderPageDelete.dataset.soundselect = "";
		sounds.applySound(changedListHeaderPageDelete);

		changedListHeaderPage.append(changedListHeaderPageDelete);
		changedListHeader.append(changedListHeaderInfo, changedListHeaderPage);

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
		allListHeaderPage.classList.add("buttonBox");

		var allListHeaderPageForward = document.createElement("span");
		allListHeaderPageForward.classList.add("forward");
		allListHeaderPageForward.dataset.soundhover = "";
		allListHeaderPageForward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageForward);

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

		var allListHeaderPageBackward = document.createElement("span");
		allListHeaderPageBackward.classList.add("backward");
		allListHeaderPageBackward.dataset.soundhover = "";
		allListHeaderPageBackward.dataset.soundselect = "";
		sounds.applySound(allListHeaderPageBackward);

		allListHeaderPage.append(allListHeaderPageBackward, allListHeaderPagePrev, allListHeaderPageCurrent, allListHeaderPageNext, allListHeaderPageForward);
		allListHeader.append(allListHeaderInfo, allListHeaderPage);

		var allListItem = document.createElement("div");
		allListItem.classList.add("itemList");

		allList.append(allListHeader, allListItem);
		container.appendChild(allList);

		//? BLACK LIST
		const addToBlackList = async (id) => {
			let list = await getBlackList();
			let itemBoxList = document.querySelectorAll(`#subScreen > div.container .item[item-id="${id}"]`);
			
			for (let item of itemBoxList)
				deleteNode(item);

			list.push(id);
			await saveBlackList(list);
		}

		this.subScreen.show(container, "dealHunt");
		let blackList = await getBlackList();
		let pageListSetupData = {
			note: { type: "note", level: "info", text: `<b style="font-size: 14px">LỰA CHỌN DANH MỤC SẢN PHẨM</b>` }
		};

		for (let key of Object.keys(pageList))
			pageListSetupData[key] = {
				type: "checkbox",
				label: pageList[key].title,
				color: "blue",
				value: true
			}

		let pageListSetup = await setup(pageListSetupData, { confirm: "Tiếp", saveKey: "pageList" });

		log("DANH SÁCH TRANG:");

		for (let key of Object.keys(pageListSetup)) {
			log(` + ` + pleft(key, 18, true) + ` = ${pageListSetup[key]}`);
			
			if (pageListSetup[key] === true)
				selectedPageList.push(pageList[key]);
		}

		// Cool Down
		await delayAsync(1000);

		var firstScanSetup = await setup({
			sortBy: {
				type: "radio",
				label: "Sắp xếp theo",
				required: false,
				list: [
					{ name: `Tên`, color: "blue", value: "name" },
					{ name: `Mức Giảm Giá`, color: "pink", value: "sale", checked: true },
					{ name: `Có Mã Giảm Giá`, color: "blue", value: "haveCoupon" },
					{ name: `Giá từ thấp đến cao (<)`, color: "blue", value: "priceUp" },
					{ name: `Giá từ cao đến thấp (>)`, color: "blue", value: "priceDown" }
				]
			},
			scanPage: { type: "number", label: "Số trang quét", value: 1 },
			saleFilter: { type: "number", label: "Lọc Item Có Sale Nhỏ Hơn", value: 0 },
			blackList: { type: "textarea", label: "Danh Sách Đen", height: "180px", value: blackList.join(";"), save: false }
		}, { confirm: "Tiếp", saveKey: "preSetup" })

		log("PRE SETUP:");

		for (let key of Object.keys(firstScanSetup))
			if (key !== "blackList")
				log(` + ` + pleft(key, 18, true) + ` = ${firstScanSetup[key]}`);
		
		// Save BlackList
		await saveBlackList(firstScanSetup.blackList.split(";"));

		// Change Layout
		run();

		runInfo({
			status: "Đang Khởi Chạy",
			end: "100%",
			current: "0",
			itemStatus: `Đang quét lần đầu`,
			itemStatusColor: "green",
			dataType: "time",
			checkDetail: "INITIALIZING"
		})

		// Start Scanning Item
		var itemList = await scanItem({
			sortBy: firstScanSetup.sortBy,
			pageCount: firstScanSetup.scanPage,
			saleFilter: firstScanSetup.saleFilter
		}, (p, now, end) => runInfo({
			now: `${p.toFixed(0)}%`,
			current: now,
			target: end,
			progress: p,
			progWarn: false,
			dataType: "time"
		}));

		var CURRENT_PAGE = 1;

		const changeAllListPage = async (page, {
			showCount = 10
		} = {}) => {
			let total = itemList.sortedList.length;
			let maxPage = (showCount === 0) ? 1 : Math.max(1, Math.floor(total / showCount));

			if (page === "last")
				page = maxPage;

			let from = Math.max((page - 1) * showCount, 0);
			let to = Math.min(page * showCount, total - 1);

			if (page > maxPage || page < 1)
				return;

			emptyNode(allListItem);
			let blackList = await getBlackList();
			
			for (let i = from; i < to; i++) {
				if (blackList.indexOf(itemList.sortedList[i].id) !== -1) {
					if (itemList.list[itemList.sortedList[i].id])
						delete itemList.list[itemList.sortedList[i].id];

					itemList.sortedList.splice(i, 1);
				}

				allListItem.appendChild(createItemBox(itemList.sortedList[i], e => addToBlackList(e.target.getAttribute("item-id"))));
				allListHeaderPageCurrent.innerText = `${from + 1}-${to + 1} ${page}/${maxPage}`;
			}

			CURRENT_PAGE = page;
		}

		changedListHeaderPageDelete.addEventListener("mouseup", e => emptyNode(changedListItem));
		allListHeaderPageForward.addEventListener("mouseup", e => changeAllListPage("last"));
		allListHeaderPageNext.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE + 1));
		allListHeaderPagePrev.addEventListener("mouseup", e => changeAllListPage(CURRENT_PAGE - 1));
		allListHeaderPageBackward.addEventListener("mouseup", e => changeAllListPage(1));
		
		changeAllListPage(CURRENT_PAGE);

		const settings = await setup({
			delay: { type: "number", label: "TGN", value: 10 },
			autoBuy: { type: "checkbox", label: "Tự động mua", color: "blue", value: false }
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
				log("");
				log(`Bắt đầu kiểm tra (lần ${runNth})`);
				await __doUpdate();
				log(` + KIỂM TRA HOÀN THÀNH`);
				log(` + Thời gian: ${(time() - startCheck).toFixed(2)}s`);

				// Reset
				runNth++;
				start = time();
				end = start + settings.delay;
				runInfo({ background: "dark" });
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
			var changed = 0;
			runInfo({ now: `0`, end: `100%`, progress: 0, checkDetail: "Đang Lấy Danh Sách Item", dataType: "time" });

			await scanItem({
				sortBy: firstScanSetup.sortBy,
				pageCount: firstScanSetup.scanPage,
				saleFilter: firstScanSetup.saleFilter,
				doSort: false,
				itemHandler: async (item) => {
					if (itemList.list[item.id] && (itemList.list[item.id].price <= item.price || itemList.list[item.id].sale >= item.sale))
						return;

					let blackList = await getBlackList();
					if (blackList.indexOf(item.id) !== -1) {
						log(` + ITEM trong BlackList: ${item.id}`);
						return;
					}

					// Increase Counter
					changed++;

					// Send Notifiaction
					let sendNotification = false;

					if (itemList.list[item.id]) {
						log(`   + ITEM Thay Đổi: ${item.id} [${changed}]`);
						log(`     + GIÁ:  ${itemList.list[item.id].price} -> ${item.price}`);
						log(`     + SALE: ${itemList.list[item.id].sale.toFixed(2)}% -> ${item.sale.toFixed(2)}%`);
						sendNotification = true;
					} else {
						log(`   + ITEM Mới: ${item.id} [${changed}]`);
						log(`     + GIÁ:  ${item.price}`);
						log(`     + SALE: ${item.sale.toFixed(2)}%`);
						sendNotification = true;
					}
		
					//? Remove Old Box If Exist
					let existBox = changedListItem.querySelectorAll(`.item[item-id="${item.id}"]`);
					for (let item of existBox)
						deleteNode(item);
					
					let showItemDetail = !settings.checkPriceHistory;

					await addIntoCart({
						id: item.id,
						count: 1
					})

					if (showItemDetail) {
						let itemBox = createChangedItemBox(item, e => addToBlackList(e.target.getAttribute("item-id")));
						changedListItem.prepend(itemBox);
						itemList.list[item.id] = item;

						if (sendNotification) {
							sounds.notification();
							chrome.notifications.create({
								type: "basic",
								title: "Deal Hunter Suite",
								message: `Đã thêm: ${item.title} [${changed}]`,
								contextMessage: `${(time() - start).toFixed(2)}s`,
								iconUrl: "/assets/img/icon@32x32.png"
							});
						}
					}
				}
			}, (p, now, end) => runInfo({
				now: `${p.toFixed(0)}%`,
				current: now,
				target: end,
				progress: p,
				progWarn: false,
				dataType: "time"
			}) );

			delete changed;

			runInfo({ now: `Bước 2`, progress: 100, progWarn: false, checkDetail: "Thành Công", dataType: "time" });
		}

		const addIntoCart = async ({
			id = 0,
			count = 0,
		} = {}) => {
			log(`Đang thêm Item ${id} C:${count} vào Giỏ Hàng`);
			let addData = {}

			try {
				addData = await command("ajax", {
					url: `${HOSTADDRESS}/gio-hang/Order/Add`,
					method: "POST",
					header: {
						"X-Requested-With": XMLHttpRequest
					},
					form: {
						id: id,
						quantity: count,
						promoCode: "",
						increase: true,
						storeId: 0,
						isQtyText: false
					}
				});
			} catch(e) {
				triggerError(e);
				return false;
			}
	
			if (addData.Code !== 200) {
				await errored("Lỗi khi thêm Item vào Giỏ");
				log(" + Không thể thêm Item vào Giỏ");
				log(`    + Code: ${addData.Code}`);
				log(`    + MSG : ${addData.Msg}`);
				throw { code: -1, description: "Không thể thêm Item vào Giỏ", data: addData.Msg }
			}

			log(" + Thêm vào giỏ thành công!");
		}

		const __doOrder = async ({
			id = 0,
			count = 1,
			coupon = "",
		}) => {
			let orderTimer = new StopClock();

			log(` + Thời gian   : ${orderTimer.stop}s`);
		}

		__checkHandler();
		log("Bắt đầu chạy");
	} catch(e) {
		triggerError(e);
		return;
	}
})()