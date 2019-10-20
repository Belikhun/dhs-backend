<?php
    //? |-----------------------------------------------------------------------------------------------|
    //? |  /lib/account.php                                                                             |
    //? |                                                                                               |
    //? |  Copyright (c) 2018-2019 Belikhun. All right reserved                                         |
    //? |  Licensed under the MIT License. See LICENSE in the project root for license information.     |
    //? |-----------------------------------------------------------------------------------------------|

    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/belibrary.php";
    require_once $_SERVER["DOCUMENT_ROOT"] ."/lib/ezsql.php";

    $usersDB = new ezsql(DB_TABLE);

    $accountData = Array();
    $accountQuery = "SELECT * FROM usersdata";
    $result = $usersDB -> query($accountQuery);

    foreach ($result as $key => $value)
        $accountData[$value["username"]] = $value;

    define("LOGIN_SUCCESS", 0);
    define("LOGIN_USERNAMENOTFOUND", 1);
    define("LOGIN_WRONGPASSWORD", 2);

    function simpleLogin($username, $password) {
        global $usersDB;

        $query = "SELECT password FROM usersdata WHERE username = ?";
        $result = $usersDB -> query($query, $username);

        if (count($result) <= 0)
            return LOGIN_USERNAMENOTFOUND;
            
        if (password_verify($password, $result[0]["password"]))
            return LOGIN_SUCCESS;
        else
            return LOGIN_WRONGPASSWORD;
    }

    define("USER_ADD_SUCCESS", 0);
    define("USER_ADD_USEREXIST", 1);
    define("USER_ADD_ERROR", 2);

    function addUser(String $id, String $username, String $password, String $name) {
        global $usersDB;
        global $accountData;

        if (isset($accountData[$username]))
            return USER_ADD_USEREXIST;

        $query = "INSERT INTO usersdata (id, username, name, password) VALUES (?, ?, ?, ?)";
        $result = $usersDB -> query($query, $id, $username, $name, $password);

        print_r($result);

        return USER_ADD_SUCCESS;
    }

    function getUserData($username) {
        global $usersDB;

        $query = "SELECT * FROM usersdata WHERE username = ?";
        $result = $usersDB -> query($query, $username);

        return isset($result[0]) ? $result[0] : null;
    }

    define("USER_EDIT_SUCCESS", 0);
    define("USER_EDIT_WRONGUSERNAME", 1);

    function editUser(String $username, Array $replace = Array()) {
        global $usersDB;
        global $accountData;

        if (!isset($accountData[$username]))
            return USER_EDIT_WRONGUSERNAME;

        foreach ($replace as $key => $value) {
            $query = "UPDATE usersdata SET $key = ? WHERE username = ?";
            $usersDB -> query($query, $value, $username);
        }

        return USER_EDIT_SUCCESS;
    }

    function deleteUser(String $username) {
        global $usersDB;
        global $accountData;

        if (!isset($accountData[$username]))
            return USER_EDIT_WRONGUSERNAME;

        $query = "DELETE FROM usersdata WHERE username = ?";
        $usersDB -> query($query, $username);

        return USER_EDIT_SUCCESS;
    }