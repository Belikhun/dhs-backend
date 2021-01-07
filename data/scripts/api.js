const info = async ({
    id,
    title,
    price,
    tags,
    hide
} = {}) => {}

const setup = async (settingList, { confirm = "Bắt đầu", cancel = "Hủy", enableSave = true, saveKey = null } = {}) => new Promise();
const heartbeat = ({ color = "green", beat = true } = {}) => {}
const rejectSetup = async (reason) => {}
const triggerError = async (error) => {}
const errored = async (message) => {}
const preRunInit = async () => {}
const run = () => {}
const order = () => {}

const runInfo = ({
    status = null,
    time = null,
    progress = null,
    progWarn = true,
    now = null,
    end = null,
    current = null,
    target = null,
    dataType = "price",
    saved = null,
    itemStatus = null,
    itemStatusColor = null,
    checkDetail = null,
    background = null
}) => {}

const subBar = ({ progress = 0, color = null } = {}) => { return { set({ progress, color }) {}, remove() {} } }
const complete = async () => {}
const sendBeacon = async (arg) => {}
const proxy = {
    allowed: false,
    scanning: false,
    ipPrefix: `192.168.1`,
    port: 25685,
    list: {},
            
    updateStatus({
        running = null,
        detail = null,
        detailSub = null,
        progress = null,
        color = null
    }) {},

    update(soft = false) {},
    scan(trusted = false) {},
    assign() {},

    async request({
        server,
        url,
        method = "GET",
        query = Array(),
        form = {},
        type = "data",
        header = Array(),
        jarID,
        force = false,
        changeState = true,
        reRequest = true,
        withCredentials = false,
        timeout = 0
    }) {},

    async cookie({
        server,
        jarID,
        url,
        name
    }) {},

    /**
     * @return {Array}
     */
    readyList() {}
}
const writeLog = (text) => {}
const logGroup = (title) => { return { write(text) {}, setTitle(title) {}, setColor(color) {} } }
const command = async (command, data = {}) => {}