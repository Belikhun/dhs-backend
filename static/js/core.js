//? |-----------------------------------------------------------------------------------------------|
//? |  /static/js/core.js                                                                           |
//? |                                                                                               |
//? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

const core = {
    initialized: false,

	async init(set) {
        clog("info", "Initializing...");
		var initTime = new stopClock();

        set(0, "Initializing: popup");
        popup.init();

        set(10, "Getting Server Config");
		await this.getServerConfigAsync();
		
		set(20, "Initializing: layout");
		this.layout.init();
		
		set(30, "Initializing: orderLogs");
        await this.orderLogs.init();

		set(40, "Initializing: keysManager");
		await this.keysManager.init();
		
		set(50, "Initializing: syslogs");
		await this.syslogs.init();
		
		//set(50, "Initializing: sounds");
        //await sounds.init((p, t) => {
        //    set(50 + p*0.5, `Initializing: sounds (${t})`);
        //});
        
		clog("debg", "Initialisation took:", {
            color: flatc("blue"),
            text: initTime.stop + "s"
        })

        set(100, "Initialized");
        clog("okay", "core.js Initialized.");
        this.initialized = true;

        console.log("%cSTOP!", "font-size: 72px; font-weight: 900;");
        console.log(
            "%cThis feature is intended for developers. Pasting something here could give strangers access to your account.",
            "font-size: 18px; font-weight: 700;"
        );
	},

	async getServerConfigAsync() {
        let start = new stopClock();
        const response = await myajax({
            url: "/api/server",
            method: "GET",
        }).catch(e => {
            errorHandler(e);

            clog("ERRR", "Error while getting server status:", {
                text: e.data.description,
                color: flatc("red"),
            });
        });

        let deltaT = (response.data.TIME + start.stop) - time();
        clog("DEBG", "🕒 Δt = ", deltaT);

        window.SERVER = response.data;
    },

    layout: {
		container: $("#mainContainer"),
		initialized: false,
		btnList: [],
		lastBtn: null,

		init() {
			if (this.initialized)
				return;

			let btnList = $("#navBar").querySelectorAll(".icon[data-active-layout]");

			for (let item of btnList) {
				let layout = parseInt(item.dataset.activeLayout);
				item.addEventListener("mouseup", e => this.changeLayout(layout));
				this.btnList[layout] = item;
			}

			this.changeLayout(2);

			clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.layout"
            });
		},

		changeLayout(layout) {
			if (!this.btnList[layout])
				throw { code: -1, description: `Cannot find button associated with layout ID: ${layout}` }

			if (this.lastBtn) {
				if (this.lastBtn.dataset.activeLayout == layout)
					return;

				this.lastBtn.classList.remove("active");
			}

			this.btnList[layout].classList.add("active");
			if (!this.btnList[layout].querySelector(".triBgContainer"));
				triBg(this.btnList[layout], { color: this.btnList[layout].dataset.color, scale: 0.6, speed: 40 });

			this.container.dataset.layout = layout;
			this.lastBtn = this.btnList[layout];
			clog("INFO", `Layout Changed To`, { text: layout, color: oscColor("pink") });
		}
	},

	orderLogs: {
		container: $("#orderLogContainer"),
		reloadBtn: $("#orderLogReloadBtn"),
		searchBox: $("#orderLogSearchBox"),

		/** @type Pager */
		pager: null,
		pageControl: {
			first: $("#orderLogPageFirst"),
			back: $("#orderLogPageBack"),
			current: $("#orderLogPageCurrent"),
			next: $("#orderLogPageNext"),
			last: $("#orderLogPageLast")
		},

		async init() {
			this.reloadBtn.addEventListener("mouseup", () => this.pager.render());

			this.pager = new Pager(this.container, 40);
			this.pager.api = {
				url: "/api/analytics/order",
				token: API_TOKEN
			}

			this.pager.renderItem((item, container) => {
				container.appendChild(htmlToElement(`
				<div class="group star sound" data-soundhover>
					<div class="item">
						<a href="${item.link}" class="detail" target="_blank">
							${
								(item.thumbnail && typeof item.thumbnail === "string")
									? `
										<span class="lazyload thumbnail">
											<img onload="this.parentNode.dataset.loaded = 1" src="${item.thumbnail}"/>
											<div class="simple-spinner"></div>
										</span>
									`
									: `<span class="lazyload thumbnail" data-errored></span>`
							}

							<span class="middle">
								<t class="itemName">${item.itemName}</t>

								${
									(item.oldPrice && typeof item.oldPrice === "number")
										? `<t class="origialPrice price">${priceFormat(item.oldPrice)}</t>`
										: ""
								}

								<span class="priceBox">
									${(item.runPrice) ? `<t class="runPrice price">${priceFormat(item.runPrice)}</t>` : ""}
									<t class="buyPrice price">${priceFormat(item.price)}</t>
									<t class="buyCount">${item.count}</t>
								</span>
							</span>

							<span class="right">
								<t class="script">${item.script}</t>
								<t class="name">${item.name}</t>
								<t class="date">${(new Date(item.time * 1000)).toLocaleString()}</t>
								<timer>
									<style scoped="scoped" onload="liveTime(this.parentElement, ${item.time}, { type: 'minimal', ended: 'Vừa mới' });"></style>
								</timer>
							</span>
						</a>

						${
							(item.note && typeof item.note === "object")
								? `
									<ul class="textView">
										<span class="showMore" onclick="this.classList.toggle('active');"></span>
										${item.note.map(i => `<li>${i}</li>`).join("")}
									</ul>
								`
								: ""
						}
					</div>
				</div>
				`))
			})

			this.pager.setFilter((item) => {
				let s = this.searchBox.value.toLowerCase();

				return (
					s === ""
					|| item.itemName.toLowerCase().includes(s)
					|| item.name.toLowerCase().includes(s)
					|| item.script.toLowerCase().includes(s)
				)
			})

			this.searchBox.addEventListener("input", () => {
				clearTimeout(this.searchTimeout);
				this.searchTimeout = setTimeout(() => this.pager.render(), 200);
			})

			this.pager.onUpdate(({ total, maxPage, currentPage, from, to }) => this.pageControl.current.innerText = `${currentPage}/${maxPage} (${from + 1}-${to + 1}: ${total})`)
			this.pageControl.first.addEventListener("mouseup", () => this.pager.setPage("first"));
			this.pageControl.back.addEventListener("mouseup", () => this.pager.back());
			this.pageControl.next.addEventListener("mouseup", () => this.pager.next());
			this.pageControl.last.addEventListener("mouseup", () => this.pager.setPage("last"));
			await this.pager.render();

			clog("OKAY", "Initialised:", {
                color: flatc("red"),
                text: "core.orderLogs"
            });
		}
	},

	keysManager: {
		container: $("#keysContainer"),
		addForm: {
			toggler: $("#keyAdd"),
			container: $("#keyAddContainer"),
			editor: $("#keyAddEditor"),
			keyNameInput: $("#addKeyName"),
			keyInput: $("#addKey"),
			tagsInput: $("#addTags"),
			addLicenses: $("#addKeyLicenses"),
			licenses: $("#addKeyLicensesList"),
			submit: $("#keyAddSubmit"),
			cancel: $("#keyAddCancel")
		},
		reloadBtn: $("#keyReloadBtn"),
		searchBox: $("#keySearchBox"),
		sortByNewSettings: $("#keySortByNew"),
		showExpiredSettings: $("#keyShowExpired"),
	
		pager: null,
		pageControl: {
			first: $("#keyPageFirst"),
			back: $("#keyPageBack"),
			current: $("#keyPageCurrent"),
			next: $("#keyPageNext"),
			last: $("#keyPageLast")
		},

		data: [],
		idData: {},
		searchTimeout: null,
		tagsColor: {
			vip: "#98ffa9",
			admin: "#fff57d",
			trial: "#eac8ff",
			tester: "#ffc6db",
			pro: "#a0ffe5"
		},
	
		async init() {
			// Set up events
			this.reloadBtn.addEventListener("mouseup", e => this.reload());
			this.sortByNewSettings.addEventListener("change", e => this.updateData());
			this.showExpiredSettings.addEventListener("change", e => this.pager.render());
	
			this.addForm.toggler.addEventListener("mouseup", e => {
				this.addForm.editor.reset();
				emptyNode(this.addForm.licenses);
				this.addForm.container.classList.add("showEditor");
				e.target.disabled = true;
				sounds.toggle(0);
			});
	
			this.addForm.cancel.addEventListener("mouseup", e => {
				this.addForm.toggler.disabled = false;
				this.addForm.container.classList.remove("showEditor");
				this.addForm.editor.reset();
				sounds.toggle(1);
			});
	
			this.addForm.addLicenses.addEventListener("mouseup", e => this.addEditEntries(this.addForm.licenses, "add"));
	
			this.addForm.editor.addEventListener("submit", async e => {
				let licenseLists = []
				let licenseNodes = this.addForm.licenses.querySelectorAll("div.row");
	
				for (let item of licenseNodes)
					licenseLists.push({
						allow: item.querySelector(".formGroup .allowInput").value,
						expire: time(new Date(`${item.querySelector(".formGroup .expireDate").value} ${item.querySelector(".formGroup .expireTime").value}`))
					});
	
				let data = {
					name: this.addForm.keyNameInput.value,
					key: this.addForm.keyInput.value,
					tags: this.addForm.tagsInput.value.split(";"),
					licenses: licenseLists
				}
	
				sounds.confirm(0);
	
				await myajax({
					url: "/api/keys/add",
					method: "POST",
					json: {
						token: API_TOKEN,
						...data
					}
				})
	
				clog("OKAY", "Thêm thành công key vào cơ sở dữ liệu!", {
					text: this.addForm.keyNameInput.value,
					color: flatc("yellow")
				});
	
				this.addForm.toggler.disabled = false;
				this.addForm.container.classList.remove("showEditor");
				this.addForm.editor.reset();
				this.reload();
			});
	
			this.pager = new Pager(this.container, 20);
			
			this.pager.renderItem((item, container) => {
				let tagsString = "";
				let licenseString = "";
	
				if (this.showExpiredSettings.checked && !item.expired)
					return;
	
				for (let license of item.licenses) {
					licenseString += `
						<span class="license">
							<t class="allow">${license.allow.split(";").join(", ")}</t>
							<t class="timeDesc">Hiệu lực còn</t>
							<span class="timer">
								<style scoped="scoped" onload="liveTime(
									this.parentElement,
									${license.expire},
									{
										count: 'down',
										type: 'minimal',
										ended: 'ĐÃ HẾT HẠN',
										endedCallback: e => {
											e.parentElement.classList.add('expired');
											fcfn(e.parentElement, 'timeDesc').innerText = \'Đã hết hạn\';
											liveTime(e, ${time() + license.valid}, { type: 'minimal' });
										}
									}
								);"></style>
							</span>
						</span>
					`
				}
	
				for (let tag of item.tags)
					tagsString += `<tag ${(typeof this.tagsColor[tag.toLowerCase()] === "string") ? `style="background-color: ${this.tagsColor[tag.toLowerCase()]}"` : ""}>${tag}</tag>`;
	
				container.appendChild(htmlToElement(`
					<div class="group user sound" data-soundhover data-edit-target="${item.id}">
						<div class="item storedKeyList ${item.expired ? "expired" : ""}">
							<span class="id">${item.id}</span>
							<ul class="info">
								<li class="keyName">${item.name}</li>
								<li class="tags">${tagsString}</li>
								<li class="key">${item.key}</li>
	
								<ul class="detail">
									<li class="create" title="Ngày tạo">${(new Date(item.createdate * 1000)).toLocaleString()}</li>
									<li class="lastUsed" title="Truy cập cuối">
										<style scoped="scoped" onload="liveTime(this.parentElement, ${item.lastused}, {prefix: 'Truy cập ', surfix: ' trước'});"></style>
									</li>
								</ul>
							</ul>
							<ul class="licenses">${licenseString}</ul>
							<span class="button">
								<span class="delete sound" data-soundhover data-soundselect onclick="core.keysManager.delete(this.parentElement.parentElement.parentElement)"></span>
								<span class="edit sound" data-soundhover data-soundselect onclick="core.keysManager.edit(this.parentElement.parentElement.parentElement)"></span>
							</span>
						</div>
						<div class="keyEditor"></div>
					</div>
				`))
			})

			this.pager.setFilter((item) => {
				let s = this.searchBox.value.toLowerCase();
				let d = this.showExpiredSettings.checked;

				return (
					s === ""
					|| item.name.toLowerCase().includes(s)
					|| item.key.toLowerCase().includes(s)
				) &&
					!(d ? !item.expired : false)
			})

			this.pager.onUpdate(({ total, maxPage, currentPage, from, to }) => this.pageControl.current.innerText = `${currentPage}/${maxPage} (${from + 1}-${to + 1}: ${total})`)
			this.pageControl.first.addEventListener("mouseup", () => this.pager.setPage("first"));
			this.pageControl.back.addEventListener("mouseup", () => this.pager.back());
			this.pageControl.next.addEventListener("mouseup", () => this.pager.next());
			this.pageControl.last.addEventListener("mouseup", () => this.pager.setPage("last"));
			this.searchBox.addEventListener("input", () => {
				clearTimeout(this.searchTimeout);
				this.searchTimeout = setTimeout(() => this.pager.render(), 200);
			})

			await this.reload();

			clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.keysManager"
            });
		},
	
		async reload() {
			let response = await myajax({
				url: "/api/keys/get",
				method: "POST",
				form: { token: API_TOKEN }
			})
	
			this.data = response.data;
			this.idData = this.data.reduce((ac, val) => { ac[val.id] = val; return ac; }, {});
			this.updateData();
			sounds.scan();
		},

		updateData() {
			this.pager.list = (this.sortByNewSettings.checked)
				? [].concat(this.data).reverse()
				: this.data;
		},
	
		addEditEntries(container, keyID, {
			allow = "",
			expire = 0,
			expired = false
		} = {}) {
			let item = document.createElement("div");
			item.classList.add("row");
			if (expired)
				item.classList.add("expired");
	
			let allowInput = createInput({ id: `allow_${keyID}_${randString(4)}`, label: "Cho Phép", value: allow, color: "blue", required: true });
			let expireDateInput = createInput({ type: "date", id: `expireDate_${keyID}_${randString(4)}`, label: "Ngày Hết Hạn", color: "blue", required: true });
			let expireTimeInput = createInput({ type: "time", id: `expireTime_${keyID}_${randString(4)}`, label: "Thời gian Hết Hạn", color: "blue", required: true });
			let expireNow = createBtn("Bây Giờ", "pink");
			let remove = createBtn("Xóa", "red");

			expireNow.type = "button";
			remove.type = "button";
			allowInput.input.classList.add("allowInput");
			expireDateInput.input.classList.add("expireDate");
			expireTimeInput.input.classList.add("expireTime");
			expireTimeInput.input.step = 1;
			allowInput.group.classList.add("large");
			expireDateInput.group.classList.add("small");
			expireTimeInput.group.classList.add("small");
			expireNow.classList.add("small");
			remove.classList.add("small");
	
			expireNow.addEventListener("mouseup", e => setDateTimeValue(expireDateInput.input, expireTimeInput.input));
			setDateTimeValue(expireDateInput.input, expireTimeInput.input, expire);
	
			remove.addEventListener("mouseup", e => container.removeChild(item));
			item.append(allowInput.group, expireDateInput.group, expireTimeInput.group, expireNow, remove);
			container.appendChild(item);
		},
	
		async edit(targetElement) {
			let keyID = targetElement.dataset.editTarget;
			let container = fcfn(targetElement, "keyEditor");
	
			clog("INFO", "Editing key ID", keyID);
	
			let htmlTemplate = `
				<form class="editor" action="javascript:void(0);">
					<span class="column grow">
						<div class="row">
							<div class="formGroup sound small" data-color="blue" data-soundselectsoft>
								<input id="keyName_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Tên" required>
								<label for="keyName_${keyID}">Tên</label>
							</div>
	
							<div class="formGroup sound large" data-color="blue" data-soundselectsoft>
								<input id="keyKey_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Khóa" required>
								<label for="keyKey_${keyID}">Key</label>
							</div>
						</div>
	
						<div class="row">
							<div class="formGroup large sound" data-color="blue" data-soundselectsoft>
								<input id="tags_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Thẻ">
								<label for="tags_${keyID}">Thẻ (ngăn cách bằng dấu cách)</label>
							</div>
						</div>
	
						<div class="row">
							<button id="addLicenses_${keyID}" type="button" class="sq-btn green sound large addLicense" data-soundhover data-soundselect>Thêm</button>
						</div>
	
						<div id="licenses_${keyID}" class="row licensesContainer"></div>
					</span>
	
					<span class="column">
						<button class="submitButton row sq-btn blue sound" data-soundhover data-soundselect>Lưu</button>
						<button class="cancelButton row sq-btn red sound" type="button" data-soundhover data-soundselect>Hủy</button>
					</span>
				</form>
			`
			
			container.innerHTML = htmlTemplate;
			sounds.scan();
			container.parentElement.classList.add("showEditor");
			sounds.toggle(0);
	
			var editor = fcfn(container, "editor");
			
			var keyNameInput = $(`#keyName_${keyID}`);
			var keyKeyInput = $(`#keyKey_${keyID}`);
			var tagsInput = $(`#tags_${keyID}`);
			var addLicenses = $(`#addLicenses_${keyID}`);
			var licenses = $(`#licenses_${keyID}`);
	
			let cancelButton = fcfn(container, "cancelButton");
	
			cancelButton.addEventListener("mouseup", e => {
				container.parentElement.classList.remove("showEditor");
				sounds.toggle(1);
				setTimeout(e => emptyNode(container), 800);
			})
	
			let response = await myajax({
				url: "/api/keys/get",
				method: "POST",
				form: {
					id: keyID,
					token: API_TOKEN
				}
			})
	
			let data = response.data;
			keyNameInput.value = data.name;
			keyKeyInput.value = data.key;
	
			if (data.tags && data.tags.length > 0)
				tagsInput.value = data.tags.join(" ");
	
			for (let item of data.licenses) {
				this.addEditEntries(licenses, keyID, {
					allow: item.allow,
					expired: item.expired,
					expire: item.expire
				});
			}
	
			addLicenses.addEventListener("mouseup", e => this.addEditEntries(licenses, keyID));
			editor.addEventListener("submit", async e => {
				let licenseLists = []
				let licenseNodes = licenses.querySelectorAll("div.row");
	
				for (let item of licenseNodes)
					licenseLists.push({
						allow: item.querySelector(".formGroup .allowInput").value,
						expire: time(new Date(`${item.querySelector(".formGroup .expireDate").value} ${item.querySelector(".formGroup .expireTime").value}`))
					});
	
				let data = {
					name: keyNameInput.value,
					key: keyKeyInput.value,
					tags: tagsInput.value.split(" "),
					licenses: licenseLists
				}
	
				sounds.confirm(0);
	
				let response = await myajax({
					url: "/api/keys/edit",
					method: "POST",
					json: {
						id: keyID,
						token: API_TOKEN,
						...data
					}
				})
	
				clog("OKAY", "Chỉnh sửa thành công key ID", {
					text: keyID,
					color: flatc("yellow")
				});
	
				this.reload();
			})
		},
	
		async delete(targetElement) {
			let keyID = targetElement.dataset.editTarget;

			if (!this.idData[keyID])
				throw { code: -1, description: `"Không tìm thấy dữ liệu key của ID ${keyID}` }
	
			let doIt = await popup.show({
				level: "warning",
				windowTitle: "Problems Editor",
				title: `Xóa \"${this.idData[keyID].name}\"`,
				message: `Xác nhận`,
				description: `Bạn có chắc muốn xóa <b>keyID${keyID}</b> không?`,
				note: `Hành động này <b>không thể hoàn tác</b> một khi đã thực hiện!`,
				buttonList: {
					delete: { text: "XÓA!!!", color: "red" },
					cancel: { text: "Hủy Bỏ", color: "blue" }
				}
			})
	
			if (doIt !== "delete")
				return false;
	
			clog("WARN", "Đang xóa key", {
				text: keyID,
				color: flatc("yellow")
			});
	
			await myajax({
				url: "/api/keys/remove",
				method: "POST",
				form: {
					id: keyID,
					token: API_TOKEN
				}
			})
	
			sounds.confirm(1);
	
			clog("OKAY", "Đã xóa key ID", {
				text: keyID,
				color: flatc("yellow")
			});
	
			this.reload();
		}
	},

	syslogs: {
		logsContainer: $("#syslogsContainer"),
		nav: {
			left: $("#syslogsNavLeft"),
			btnLeft: $("#syslogsNavBtnLeft"),
			currentPage: $("#syslogsNavPage"),
			btnRight: $("#syslogsNavBtnRight"),
			right: $("#syslogsNavRight")
		},

		prevHash: "",
		showPerPage: 20,
		currentPage: 1,
		maxPage: 1,

		async init() {
			this.nav.btnLeft.addEventListener("click", e => {
				this.currentPage--;

				if (this.currentPage < 1)
					this.currentPage = 1;

				this.refresh();
			});

			this.nav.btnRight.addEventListener("click", e => {
				this.currentPage++;

				if (this.currentPage > this.maxPage)
					this.currentPage = this.maxPage;

				this.refresh();
			});

			await this.refresh();

			clog("okay", "Initialised:", {
                color: flatc("red"),
                text: "core.syslogs"
            });
		},

		async refresh(clearLogs = false) {
			let response = {}

			try {
				response = await myajax({
					url: "/api/logs",
					method: "POST",
					form: {
						token: API_TOKEN,
						clear: clearLogs,
						show: this.showPerPage,
						page: this.currentPage
					}
				})
			} catch(e) {
				if (e.data.code === 6) {
					clog("WARN", `Không tồn tại trang ${this.currentPage} của nhật ký hệ thống.`, e.data.data);
					this.currentPage = 1;
					this.maxPage = e.data.data.maxPage;
					await this.refresh();

					return;
				}

				throw e;
			}

			let data = response.data;
			let hash = response.hash;
			if (hash === this.prevHash)
				return;

			this.prevHash = hash;
			this.nav.left.innerText = `Hiển thị ${data.from} - ${data.to}`;
			this.nav.currentPage.innerText = `Trang ${data.pageNth}/${data.maxPage}`;
			this.nav.right.innerText = `Tổng ${data.total}`;
			this.maxPage = data.maxPage;
			var html = [];

			for (let i of data.logs)
				html.push(`
					<div class="log ${i.level.toLowerCase()}" onclick="this.classList.toggle('enlarge')">
						<span class="level">${i.level}<i>#${i.nth}</i></span>
						<span class="detail">
							<div class="text">${i.text}</div>
							<div class="info">
								<t class="client">${i.client.username}@${i.client.ip}</t>
								<t class="timestamp">${i.time}</t>
								<t class="module">${i.module}</t>
							</div>
						</span>
					</div>
				`);
			
			this.logsContainer.innerHTML = html.join("\n");
			clog("info", `Refreshed SysLogs [${hash}]`);
		}
	},
}