//? |-----------------------------------------------------------------------------------------------|
//? |  /assets/js/account.js                                                                        |
//? |                                                                                               |
//? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
//? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
//? |-----------------------------------------------------------------------------------------------|

const sbar = new statusBar(document.body);
sbar.additem(USERNAME, "account", {space: false, aligin: "left"});

document.__onclog = (type, ts, msg) => {
    type = type.toLowerCase();
    const typelist = ["okay", "warn", "errr", "crit", "lcnt"]
    if (typelist.indexOf(type) === -1)
        return false;

    sbar.msg(type, msg, {time: ts, lock: (type === "crit" || type === "lcnt") ? true : false});
}

$("body").onload = e => {
    if (cookie.get("__darkMode") === "true")
        document.body.classList.add("dark");

    if (window.frameElement)
        document.body.classList.add("embeded");

    keysManager.init()
    sounds.init();
}

function cvtime(h, m, s) {
    return [h, m, s]
        .map(v => v < 10 ? "0" + v : v)
        .join(":");
}

function cvdate(d, m, y) {
    return [y, m, d]
        .map(v => v < 10 ? "0" + v : v)
        .join("-");
}

const keysManager = {
    container: $("#keysContainer"),
    addForm: {
        toggler: $("#keyAdd"),
        container: $("#keyAddContainer"),
        editor: $("#keyAddEditor"),
        keyNameInput: $("#addKeyName"),
        keyInput: $("#addKey"),
        allowInput: $("#addAllow"),
        tagsInput: $("#addTags"),
        keyExpireDateInput: $("#addKeyExpireDate"),
        keyExpireTimeInput: $("#addKeyExpireTime"),
        keyExpireNow: $("#addKeyExpireNow"),
        submit: $("#addSubmit"),
        cancel: $("#addCancel")
    },
    reloadBtn: $("#reloadBtn"),
    sortByNewSettings: $("#sortByNew"),
    showExpiredSettings: $("#showExpired"),

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
        this.sortByNewSettings.addEventListener("change", e => this.reload());
        this.showExpiredSettings.addEventListener("change", e => this.reload());

        this.addForm.toggler.addEventListener("mouseup", e => {
            this.addForm.editor.reset();
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

        this.addForm.keyExpireNow.addEventListener("mouseup", e => {
            let now = new Date();

            this.addForm.keyExpireDateInput.value = cvdate(
                now.getDate(),
                now.getMonth() + 1,
                now.getFullYear()
            );

            this.addForm.keyExpireTimeInput.value = cvtime(
                now.getHours(),
                now.getMinutes(),
                0
            );
        })

        this.addForm.editor.addEventListener("submit", async e => {
            let data = {
                name: this.addForm.keyNameInput.value,
                key: this.addForm.keyInput.value,
                allow: this.addForm.allowInput.value,
                tags: this.addForm.tagsInput.value,
                expire: time(new Date(`${this.addForm.keyExpireDateInput.value} ${this.addForm.keyExpireTimeInput.value}`))
            }

            sounds.confirm(0);

            let response = await myajax({
                url: "/api/keys/add",
                method: "POST",
                form: {
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

        await this.reload();
    },

    async reload() {
        let response = await myajax({
            url: "/api/keys/get",
            method: "POST",
            form: { token: API_TOKEN }
        })

        emptyNode(this.container);
        let html = "";
        let data = response.data;

        if (this.sortByNewSettings.checked)
            data = data.reverse();

        for (let key of Object.keys(data)) {
            let keyData = data[key];
            let tagsString = "";

            if (this.showExpiredSettings.checked && !keyData.expired)
                continue;

            for (let item of keyData.tags)
                tagsString += `<tag ${(typeof this.tagsColor[item.toLowerCase()] === "string") ? `style="background-color: ${this.tagsColor[item.toLowerCase()]}"` : ""}>${item}</tag>`;

            html += `
                <div class="group user sound" data-soundhover data-edit-target="${keyData["id"]}">
                    <div class="item storedKeyList">
                        <span class="id">${keyData["id"]}</span>
                        <ul class="info">
                            <li class="keyName">${keyData["name"]}</li>
                            <li class="tags">${tagsString}</li>
                            <li class="key">${keyData["key"]}</li>
                            <li class="allow">Cho phép: <b>${keyData["allow"].split(";").join(", ")}</b></li>
                        </ul>
                        <ul class="detail">
                            <li class="create" title="Ngày tạo">${(new Date(keyData["createdate"] * 1000)).toLocaleString()}</li>
                            <li class="lastUsed" title="Truy cập cuối">
                                <style scoped="scoped" onload="liveTime(this.parentElement, ${keyData["lastused"]}, {prefix: 'Truy cập ', surfix: ' trước'});"></style>
                            </li>
                            <li class="expire" title="Hết hạn">
                                <style scoped="scoped" onload="liveTime(
                                    this.parentElement,
                                    ${keyData["expire"]},
                                    {
                                        count: 'down',
                                        prefix: 'Hết hạn sau ',
                                        ended: 'đã hết hạn',
                                        endedCallback: e => {
                                            e.parentElement.parentElement.classList.add('expired');
                                            liveTime(e, ${keyData["expire"]}, { prefix: 'Đã hết hạn ', surfix: ' trước' });
                                        }
                                    }
                                );"></style>
                            </li>
                        </ul>
                        <span class="button">
                            <span class="delete sound" data-soundhover data-soundselect onclick="keysManager.delete(this.parentElement.parentElement.parentElement)"></span>
                            <span class="edit sound" data-soundhover data-soundselect onclick="keysManager.edit(this.parentElement.parentElement.parentElement)"></span>
                        </span>
                    </div>
                    <div class="keyEditor"></div>
                </div>
            `
        }

        this.container.innerHTML = html;
        sounds.scan();
    },

    async edit(targetElement) {
        let keyID = targetElement.dataset.editTarget;
        let container = fcfn(targetElement, "keyEditor");

        clog("INFO", "Editing key ID", keyID);

        let htmlTemplate = `
            <form class="editor" action="javascript:void(0);">
                <span class="column grow">
                    <div class="row">
                        <div class="formGroup blue sound small" data-soundselectsoft>
                            <input id="keyName_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Tên" required>
                            <label for="keyName_${keyID}">Tên</label>
                        </div>

                        <div class="formGroup blue sound large" data-soundselectsoft>
                            <input id="keyKey_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Khóa" required>
                            <label for="keyKey_${keyID}">Key</label>
                        </div>
                    </div>

                    <div class="row">
                        <div class="formGroup blue large sound" data-soundselectsoft>
                            <input id="keyAllow_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Script cho phép" required>
                            <label for="keyAllow_${keyID}">Danh sách script cho phép (ngăn cách bằng ";")</label>
                        </div>

                        <div class="formGroup blue large sound" data-soundselectsoft>
                            <input id="tags_${keyID}" type="text" class="formField" autocomplete="off" placeholder="Thẻ">
                            <label for="tags_${keyID}">Thẻ (ngăn cách bằng dấu cách)</label>
                        </div>
                    </div>

                    <div class="row">
                        <div class="formGroup blue sound large" data-soundselectsoft>
                            <input id="keyExpireDate_${keyID}" type="date" class="formField" autocomplete="off" placeholder="Ngày hết hạn" required>
                            <label for="keyExpireDate_${keyID}">Ngày hết hạn</label>
                        </div>

                        <div class="formGroup grow blue sound small" data-soundselectsoft>
                            <input id="keyExpireTime_${keyID}" type="time" class="formField" autocomplete="off" placeholder="Giờ hết hạn" required>
                            <label for="keyExpireTime_${keyID}">Giờ hết hạn</label>
                        </div>

                        <button id="keyExpireNow_${keyID}" class="sq-btn pink small sound" type="button" data-soundhover data-soundselect>Bây giờ</button>
                    </div>
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
        var keyAllowInput = $(`#keyAllow_${keyID}`);
        var tagsInput = $(`#tags_${keyID}`);
        var keyExpireDateInput = $(`#keyExpireDate_${keyID}`);
        var keyExpireTimeInput = $(`#keyExpireTime_${keyID}`);
        var keyExpireNow = $(`#keyExpireNow_${keyID}`);

        let submitButton = fcfn(container, "submitButton");
        let cancelButton = fcfn(container, "cancelButton");

        cancelButton.addEventListener("mouseup", e => {
            container.parentElement.classList.remove("showEditor");
            sounds.toggle(1);
        });

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
        keyAllowInput.value = data.allow;
        tagsInput.value = data.tags.join(" ");

        let expireTime = new Date(data.expire * 1000);
        keyExpireDateInput.value = cvdate(
            expireTime.getDate(),
            expireTime.getMonth() + 1,
            expireTime.getFullYear()
        );
        keyExpireTimeInput.value = cvtime(
            expireTime.getHours(),
            expireTime.getMinutes(),
            0
        );

        // Set up events
        keyExpireNow.addEventListener("mouseup", e => {
            let now = new Date();

            keyExpireDateInput.value = cvdate(
                now.getDate(),
                now.getMonth() + 1,
                now.getFullYear()
            );

            keyExpireTimeInput.value = cvtime(
                now.getHours(),
                now.getMinutes(),
                0
            );
        })

        editor.addEventListener("submit", async e => {
            let data = {
                name: keyNameInput.value,
                key: keyKeyInput.value,
                allow: keyAllowInput.value,
                tags: tagsInput.value,
                expire: time(new Date(`${keyExpireDateInput.value} ${keyExpireTimeInput.value}`))
            }

            sounds.confirm(0);

            let response = await myajax({
                url: "/api/keys/edit",
                method: "POST",
                form: {
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

        let doIt = confirm(`Bạn có chắc muốn xóa key ID ${keyID} không?\nHành động này không thể hoàn tác một khi đã thực hiện!`);

        if (doIt !== true)
            return false;

        clog("WARN", "Đang xóa key", {
            text: keyID,
            color: flatc("yellow")
        });

        let respond = await myajax({
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
}