<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  index.php                                                                                    |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2020 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|
    
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/data/config.php";

    if ($_SESSION["id"] !== "admin") {
        require "login.php";
        die();
    }

    setcookie("__s_m", "true");
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Quản lý license keys | <?php print APPNAME ." v". VERSION; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/material-font.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/fontawesome.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/calibri.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/opensans.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/fonts/exo.css?v=<?php print VERSION; ?>" />

    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/default.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/statusBar.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/scrollBar.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/input.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/switch.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/button.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/spinner.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/menu.css?v=<?php print VERSION; ?>" />
    <link rel="stylesheet" type="text/css" media="screen" href="/assets/css/keysManager.css?v=<?php print VERSION; ?>" />
</head>

<body id="container">
    <div class="wrapper">
        <div class="menu">
            <div class="group home">
                <t class="title big">Quản lý keys</t>
                <t class="title small">Thêm, chỉnh sửa hoặc xóa key</t>

                <div class="space"></div>
            </div>

            <div class="group plus">
                <div class="item line sound" data-soundhover style="justify-content: center;">
                    <button id="keyAdd" class="sq-btn dark sound" style="margin: 0 5px;" data-soundhover data-soundselect>Thêm một key mới</button>
                    <button id="reloadBtn" class="sq-btn blue sound" style="margin: 0 5px;" data-soundhover data-soundselect>Làm mới</button>
                    <a class="sq-btn pink sound" style="margin: 0 5px;" href="/account.php" data-soundhover data-soundselect>Quản lí tài khoản</a>
                </div>

                <div id="keyAddContainer" class="keyEditor">
                    <form id="keyAddEditor" class="editor" action="javascript:void(0);">
                        <span class="column grow">
                            <div class="row">
                                <div class="formGroup blue sound small" data-soundselectsoft>
                                    <input id="addKeyName" type="text" class="formField" autocomplete="off" placeholder="Tên người dùng" required>
                                    <label for="addKeyName">Tên</label>
                                </div>

                                <div class="formGroup grow blue sound large" data-soundselectsoft>
                                    <input id="addKey" type="text" class="formField" autocomplete="off" placeholder="ID" required>
                                    <label for="addKey">Key</label>
                                </div>
                            </div>

                            <div class="row">
                                <div class="formGroup blue large sound" data-soundselectsoft>
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
                            <button id="addSubmit" class="row sq-btn blue sound" data-soundhover data-soundselect>Thêm</button>
                            <button id="addCancel" class="row sq-btn red sound" type="button" data-soundhover data-soundselect>Hủy</button>
                        </span>
                    </form>
                </div>

                <div class="item lr sound" data-soundhoversoft>
                    <t class="left">Mới nhất xếp trước</t>
                    <label class="sq-checkbox right">
                        <input id="sortByNew" type="checkbox" class="sound" data-soundcheck>
                        <span class="checkmark"></span>
                    </label>
                </div>

                <div class="item lr sound" data-soundhoversoft>
                    <t class="left">Chỉ hiển thị key đã hết hạn</t>
                    <label class="sq-checkbox pink right">
                        <input id="showExpired" type="checkbox" class="sound" data-soundcheck>
                        <span class="checkmark"></span>
                    </label>
                </div>
            </div>

            <div id="keysContainer">
            </div>
        </div>
    </div>

    <script>
        const API_TOKEN = `<?php print isset($_SESSION["apiToken"]) ? $_SESSION["apiToken"] : null; ?>`;
        const USERNAME = `<?php print $_SESSION["username"]; ?>`;
    </script>
    <script src="assets/js/belibrary.js?v=<?php print VERSION; ?>"></script>
    <script src="assets/js/statusBar.js?v=<?php print VERSION; ?>"></script>
    <script src="assets/js/sounds.js?v=<?php print VERSION; ?>"></script>
    <script src="assets/js/keysManager.js?v=<?php print VERSION; ?>"></script>

    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=<?php print TRACK_ID; ?>"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments) }
        gtag("js", new Date());

        gtag("config", `<?php print TRACK_ID; ?>`);
    </script>
</body>