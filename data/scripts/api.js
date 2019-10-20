
const createInput = (type, id, label, value, required = false) => {}
const createSwitch = (text, color, value, type = "checkbox") => {}
const createBtn = (text, color = "blue") => {}
const priceFormat = (num) => num.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
var scriptCancelHandler = async () => {};
const onCancel = (f) => scriptCancelHandler = f;

const info = async ({
    id = null,
    title = null,
    price = null,
    tags = null
} = {}) => {}

const setup = async (settingList, { confirm = "Bắt đầu", cancel = "Hủy" } = {}) => {}
const heartbeat = ({ color = "green", beat = true } = {}) => {}
const rejectSetup = async (reason) => {}
const triggerError = async (error) => {}
const errored = async (message) => {}
const preRunInit = async () => {}
const run = () => {}
const order = () => {}

const runInfo = async ({
    status = null,
    time = null,
    progress = null,
    progWarn = true,
    now = null,
    end = null,
    currentPrice = null,
    targetPrice = null,
    saved = null,
    itemStatus = null,
    itemStatusColor = null,
    checkDetail = null,
} = {}) => {}

const complete = async () => {}
const writeLog = (text) => {}
const command = async (command, data = {}) => {};