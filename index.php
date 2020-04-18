<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  index.php                                                                                    |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    // SET PAGE TYPE
    define("PAGE_TYPE", "NORMAL");
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";
    header("Cache-Control: max-age=0, must-revalidate", true);
    
    define("LAN_ADDR", getHostByName(getHostName()));

    $loggedIn = false;
    $username = null;
    $userdata = null;
    $name = null;
    $id = null;

    if (isLoggedIn()) {
        require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/account.php";
        $loggedIn = true;
        $username = $_SESSION["username"];
        $userdata = getUserData($username);
        
        if (!$userdata) {
            session_destroy();
            session_start();

            // Unset all of the session variables
            $_SESSION = Array();
            $_SESSION["username"] = null;
            $_SESSION["id"] = null;
            $_SESSION["name"] = null;
            $_SESSION["apiToken"] = null;

            header("Refresh:0; url=/");
            die();
        }

        $name = $userdata["name"];
        $id = $userdata["id"];
    }

    $stripedContestDescription = strip_tags($config["app"]["description"]);
?>

    <!DOCTYPE html>
    <html lang="vi-VN">

    <head>
        <meta charset="utf-8" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">

        <!-- Thay đổi tiêu đề trang hiện đã có trong phần Admin Control Panel -->
        <title><?php print $config["pageTitle"]; ?> | <?php print APPNAME ." v". VERSION; ?></title>

        <!-- Primary Meta Tags -->
        <meta name="title" content="<?php print $config["app"]["title"]; ?>">
        <meta name="description" content="<?php print $stripedContestDescription; ?>">

        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:title" content="<?php print $config["app"]["title"]; ?>">
        <meta property="og:description" content="<?php print $stripedContestDescription; ?>">

        <!-- Twitter -->
        <meta property="twitter:card" content="summary_large_image">
        <meta property="twitter:title" content="<?php print $config["app"]["title"]; ?>">
        <meta property="twitter:description" content="<?php print $stripedContestDescription; ?>">

        <!-- Load Library First -->
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/default.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/splash.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/progressBar.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/button.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/input.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/textView.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/table.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/switch.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/slider.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/static/css/navbar.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/static/css/userSetting.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/menu.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/spinner.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/statusBar.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/scrollBar.css?v=<?php print VERSION; ?>" />
        <!-- Page Style -->
        <link rel="stylesheet" type="text/css" media="screen" href="/static/css/core.css?v=<?php print VERSION; ?>" />
        <!-- Fonts -->
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/calibri/calibri.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/opensans/opensans.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/nunito/nunito.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/consolas/consolas.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/fontawesome/fontawesome.css?v=<?php print VERSION; ?>" />
        <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/materialicons/materialicons.css?v=<?php print VERSION; ?>" />
    </head>

    <body class="<?php print ($loggedIn ? ($id === 'admin' ? 'admin' : 'user') : 'guest'); ?>">

        <!-- Init Library and Splash First -->
        <script src="/assets/js/belibrary.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
        <script src="/assets/js/errorHandler.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
        <script type="text/javascript" src="/assets/js/splash.js?v=<?php print VERSION; ?>"></script>
        <script type="text/javascript">
            var mainSplash = new splash(document.body, `<?php print $config["app"]["title"]; ?>`, `<?php print $stripedContestDescription; ?>`, "/api/images/icon");

            mainSplash.init = async set => {
                set(0, "Initializing core.js?v=<?php print VERSION; ?>");
                await core.init(set);
            }

            mainSplash.postInit = async set => {
                set(60, "Setting up statusBar");
                sbar.additem(SERVER.SERVER_SOFTWARE, "server");
                sbar.additem(SERVER.SERVER_ADDR, "globe");
                sbar.additem(SERVER.username ? SERVER.username : "Chưa đăng nhập", "account", {align: "right"});
                sbar.additem(SERVER.REMOTE_ADDR, "desktop", {align: "right"});

                set(95, "Sending Analytics Data...");
                gtag("event", "pageView", {
                    version: SERVER.version,
                    hostname: location.hostname,
                    loadtime: ((new Date()).getTime() - window.performance.timing.navigationStart) / 1000,
                    downlink: (navigator && navigator.connection) ? navigator.connection.downlink : 0,
                    versiontag: SERVER.versionTag,
                    contestname: SERVER.contestName,
                    platform: (navigator) ? navigator.platform : null,
                    darkmode: cookie.get("__darkMode"),

                    event_category: "load",
                    event_label: "scriptInitialized",
                    send_to: "default",
                    event_callback: () => clog("INFO", "Analytics data sent!")
                });
            }

            mainSplash.onErrored = async (error, e, d) => {
                if (cookie.get("splashInitSuccess", true) === "false")
                    if (popup.initialized) {
                        let errorDetail = document.createElement("ul");
                        let errorDetailHtml = "";
                        let stack = (error.data && error.data.stack) || error.stack || null

                        errorDetailHtml = stack
                            ? stack
                                .split("\n")
                                .map(i => `<li>${i}</li>`)
                                .join("")
                            : `<li>${e} >>> ${d}</li>`;
                        
                        errorDetail.classList.add("textView", "small", "noBreakLine");
                        errorDetail.style.flexDirection = "column";
                        errorDetail.innerHTML = errorDetailHtml;

                        let action = await popup.show({
                            windowTitle: "Lỗi",
                            title: "Oops",
                            description: "Có vẻ như lỗi vẫn đang tiếp diễn!<br>Hãy thử <b>tải lại</b> trang hoặc sử dụng thông tin dưới đây để gửi một báo cáo lỗi:",
                            level: "error",
                            customNode: errorDetail,
                            buttonList: {
                                report: {
                                    text: "Báo lỗi",
                                    color: "pink",
                                    resolve: false,
                                    onClick: () => window.open(SERVER.REPORT_ERROR, "_blank")
                                },
                                reload: { text: "Tải lại", color: "blue" },
                                close: { text: "Đóng", color: "dark" }
                            }
                        })

                        switch (action) {
                            case "reload":
                                location.reload();
                                break;
                        }
                        
                    } else
                        alert(error);
            }
        </script>

        <!-- Main Content -->

        <div class="fixedContainer">
            <div id="navBar" class="navBar">
				<div class="group top">
					<?php if ($loggedIn) { ?>
						<img id="userAvatar" class="avatar" src="/api/avatar?u=<?php print $username; ?>" />
					<?php } ?>
				</div>

				<div class="group middle">
					<span class="icon chart sound" data-active-layout="1" data-color="green" data-soundhover data-soundselect></span>
					<span class="icon cart sound" data-active-layout="2" data-color="blue" data-soundhover data-soundselect></span>
					<span class="icon key sound" data-active-layout="3" data-color="pink" data-soundhover data-soundselect></span>
					<span class="icon book sound" data-active-layout="4" data-color="red" data-soundhover data-soundselect></span>
					<span class="icon user sound" data-active-layout="5" data-color="yellow" data-soundhover data-soundselect></span>
				</div>

				<div class="group bottom">
					<span class="icon config sound" data-active-layout="6" data-color="brown" data-soundhover data-soundselect></span>
				</div>
            </div>

            <div id="mainContainer">
                <div class="container orderLogs menu">
				    <div class="group home">
						<t class="title big">Nhật kí mua hàng</t>
						<t class="title small">Danh sách Item mua thành công bằng tool</t>
		
						<div class="space"></div>
					</div>
		
					<div class="group tools">
						<div class="item lr sound" data-soundhover>
							<span class="left">
								<button id="orderLogReloadBtn" class="sq-btn blue sound" data-soundhover data-soundselect>Làm mới</button>
                            </span>

                            <span class="middle formGroup searchBox sound" data-color="blue" data-soundselectsoft>
								<input id="orderLogSearchBox" type="text" class="formField" autocomplete="off" placeholder="Nhập Từ Khóa" required>
								<label for="orderLogSearchBox">Tìm Kiếm</label>
							</span>
                            
							<span class="right buttonBox">
								<span id="orderLogPageFirst" class="backward" data-soundhover data-soundselect></span>
								<span id="orderLogPageBack" class="prev" data-soundhover data-soundselect></span>
								<t id="orderLogPageCurrent" class="current"></t>
								<span id="orderLogPageNext" class="next" data-soundhover data-soundselect></span>
								<span id="orderLogPageLast" class="forward" data-soundhover data-soundselect></span>
							</span>
						</div>
                    </div>
                    
                    <div class="orderLogList" id="orderLogContainer">
					</div>
				</div>

				<div class="container keysManager menu">
					<div class="group home">
						<t class="title big">Quản lý keys</t>
						<t class="title small">Thêm, chỉnh sửa hoặc xóa key</t>
		
						<div class="space"></div>
					</div>
		
					<div class="group plus">
						<div class="item lr sound" data-soundhover>
							<span class="left">
								<button id="keyAdd" class="sq-btn dark sound" data-soundhover data-soundselect>Thêm</button>
								<button id="keyReloadBtn" class="sq-btn blue sound" data-soundhover data-soundselect>Làm mới</button>
							</span>

							<span class="middle formGroup searchBox sound" data-color="blue" data-soundselectsoft>
								<input id="keySearchBox" type="text" class="formField" autocomplete="off" placeholder="Nhập Từ Khóa" required>
								<label for="keySearchBox">Tìm Kiếm</label>
							</span>

							<span class="right buttonBox">
								<span id="keyPageFirst" class="backward" data-soundhover data-soundselect></span>
								<span id="keyPageBack" class="prev" data-soundhover data-soundselect></span>
								<t id="keyPageCurrent" class="current"></t>
								<span id="keyPageNext" class="next" data-soundhover data-soundselect></span>
								<span id="keyPageLast" class="forward" data-soundhover data-soundselect></span>
							</span>
						</div>
		
						<div id="keyAddContainer" class="keyEditor">
							<form id="keyAddEditor" class="editor" action="javascript:void(0);">
								<span class="column grow">
									<div class="row">
										<div class="formGroup sound small" data-color="blue" data-soundselectsoft>
											<input id="addKeyName" type="text" class="formField" autocomplete="off" placeholder="Tên người dùng" required>
											<label for="addKeyName">Tên</label>
										</div>
		
										<div class="formGroup grow sound large" data-color="blue" data-soundselectsoft>
											<input id="addKey" type="text" class="formField" autocomplete="off" placeholder="ID" required>
											<label for="addKey">Key</label>
										</div>
									</div>
		
									<div class="row">
										<div class="formGroup large sound" data-color="blue" data-soundselectsoft>
											<input id="addTags" type="text" class="formField" autocomplete="off" placeholder="Thẻ">
											<label for="addTags">Thẻ (ngăn cách bằng dấu cách)</label>
										</div>
									</div>
		
									<div class="row">
										<button id="addKeyLicenses" type="button" class="sq-btn green sound large addLicense" data-soundhover data-soundselect>Thêm</button>
									</div>
		
									<div id="addKeyLicensesList" class="row licensesContainer"></div>
								</span>
				
								<span class="column">
									<button id="keyAddSubmit" class="row sq-btn blue sound" data-soundhover data-soundselect>Thêm</button>
									<button id="keyAddCancel" class="row sq-btn red sound" type="button" data-soundhover data-soundselect>Hủy</button>
								</span>
							</form>
						</div>
		
						<div class="item sortBox sound" data-soundhoversoft>
							<span class="switch">
								<t class="left">Mới nhất xếp trước</t>
								<label class="sq-checkbox right">
									<input id="keySortByNew" type="checkbox" class="sound" data-soundcheck>
									<span class="checkmark"></span>
								</label>
							</span>

							<span class="switch">
								<t class="left">Chỉ hiển thị key đã hết hạn</t>
								<label class="sq-checkbox pink right">
									<input id="keyShowExpired" type="checkbox" class="sound" data-soundcheck>
									<span class="checkmark"></span>
								</label>
							</span>
						</div>
					</div>
		
					<div class="keyList" id="keysContainer">
					</div>
                </div>

                <div class="container syslogs">
                    <div id="syslogsContainer" class="logsContainer showEmpty"></div>
                    <div class="navigation">
                        <span id="syslogsNavLeft" class="left"></span>
                        <span class="middle">
                            <span id="syslogsNavBtnLeft" class="icon buttonLeft sound" data-soundhover data-soundselect></span>
                            <span id="syslogsNavPage" class="currentPage"></span>
                            <span id="syslogsNavBtnRight" class="icon buttonRight sound" data-soundhover data-soundselect></span>
                        </span>
                        <span id="syslogsNavRight" class="right"></span>
                    </div>
                </div>
                
                <iframe src="/account.php" class="container account"></iframe>
            </div>
        </div>

        <!-- Session Data -->
        <script>
            const IS_ADMIN = `<?php print ($id === "admin" ? "true" : "false"); ?>` === "true";
            const LOGGED_IN = `<?php print ($loggedIn === true ? "true" : "false"); ?>` === "true";
            const API_TOKEN = `<?php print isset($_SESSION["apiToken"]) ? $_SESSION["apiToken"] : null; ?>`;
        </script>

        <script src="/assets/js/statusBar.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
        <script type="text/javascript">
            const sbar = new statusBar(document.body);
            sbar.__item = new Array();

            document.__onclog = (type, ts, msg) => {
                type = type.toLowerCase();
                const typeList = ["okay", "warn", "errr", "crit", "lcnt"]
                if (typeList.indexOf(type) === -1)
                    return false;

                if (type === "errr")
                    sbar.__item.errr.change(parseInt(sbar.__item.errr.get()) + 1);
                else if (type === "warn")
                    sbar.__item.warn.change(parseInt(sbar.__item.warn.get()) + 1);

                sbar.msg(type, msg, {time: ts, lock: (type === "crit" || type === "lcnt") ? true : false});
            }

            sbar.__item.warn = sbar.additem("0", "warning", {space: false});
            sbar.__item.errr = sbar.additem("0", "error");
        </script>

        <!-- Sounds -->
        <script src="/assets/js/sounds.js?v=<?php print VERSION; ?>" type="text/javascript"></script>

        <!-- Core script -->
        <script src="/static/js/core.js?v=<?php print VERSION; ?>" type="text/javascript"></script>
        
        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=<?php print TRACK_ID; ?>"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments) }
            gtag("js", new Date());

            gtag("config", `<?php print TRACK_ID; ?>`, { groups: "default" });
        </script>

    </body>

    </html>