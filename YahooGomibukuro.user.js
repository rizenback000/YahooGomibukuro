// ==UserScript==
// @name            YahooGomibukuro
// @namespace       https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q1224340137
// @description     頭の中ハッピーセットの回答者をNG
// @include         https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/*
// @require         http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_deleteValue
// @grant GM_listValues
// ==/UserScript==

(function ($) {
  //@nameから取ってこれないのかな?
  const SCRIPT_NAME = "YahooGomibukuro";
  const VERSION = "1.0.0";
  const BTN_REG = "NG登録";
  const BTN_DEL = "NG解除";
  const BTN_SHOW = "一時表示";
  const BTN_HIDE = "閉じる";
  const NG_USER = "NGUser";
  const NG_ICON = "data:image/gif;base64,R0lGODlhMAARAIAAAAAAAP///yH5BAAAAAAALAAAAAAwABEAAAJbhI+py+0Po5y02ntCyFmjzRmaJ44gYH4nuIbiq5yfu7EoI9vx0r62PAuRgone7Vcy3jqrVDLnW8Kk1NI0CD1SlUBYdzlsTo1DLI/WYeZG6iZ7/MXI5/S6/W4vAAA7";
  var DISP = {
    SHOW: 0,
    HIDE: 1
  };

  var BEFORE = {
    USER: "data-"+SCRIPT_NAME+"_user",
    ICON: "data-"+SCRIPT_NAME+"_icon"
  };

  var initDivStyle = {
     color:"#0",
     textShadow:"0 1px 2px #ffffff",
     borderRadius:"3px",
     backgroundColor:"#eaeaea",
     boxShadow: "0 1px 0 rgba(255, 255, 255, 0.3) inset,0 0 5px rgba(0, 0, 0, 0.3) inset,0 1px 2px rgba(0, 0, 0, 0.3)",
     padding: "5px 5px",
     cursor: "pointer",
     textAlign: "center"
  }


  //すべての回答の下にコメント表示パネルを設置
  //このへんの取得汚すぎる
  $(".usrNm a").each(function (){
    var user = this;
    var userName = $(user).text();
    var ansBody = $(user).parents().next(".ptsQes");
    var avtr = $(user).parents(".usrQstn").prev().find("img[alt='プロフィール画像']");
    //ボタン
    var ignoreButton = $("<button />", {text:BTN_REG});
    var showButton = $("<button />", {text:BTN_SHOW}).hide();

    //一時表示・非表示の共通処理
    function DisplayProc(type){
      if (type == DISP.SHOW){
        //回答を開いて一時表示ボタンは隠さない
        $(ansBody).show();
        //$(showButton).hide();
        $(showButton).text(BTN_HIDE);
        $(user).text($(user).attr(BEFORE.USER));
        $(avtr).attr("src", $(avtr).attr(BEFORE.ICON));
      }else{
        //回答を閉じて一時表示ボタンを表示
        $(ansBody).hide();
        $(showButton).text(BTN_SHOW);
        $(showButton).show();
        $(user).text(NG_USER);
        $(avtr).attr("src", NG_ICON);
      }
    }

    //NG登録ボタン追加
    $(user).parent().append(ignoreButton).append(showButton);

    //一時表示用に元のユーザ名とアイコン画像を保存しておく
    $(user).attr(BEFORE.USER, userName);
    $(avtr).attr(BEFORE.ICON, $(avtr).attr("src"));

    //既に設定が存在する場合の処理
    if (GM_listValues().indexOf(userName) >= 0){
      $(ignoreButton).text(BTN_DEL);
      DisplayProc(DISP.HIDE);
    }

    //NG登録・解除ボタン処理
    //未登録なら登録,登録済みなら削除
    $(ignoreButton).click(function (){
      if (GM_listValues().indexOf(userName) >= 0){
        DisplayProc(DISP.SHOW);
        $(this).text(BTN_REG);
        GM_deleteValue(userName, "");
        $(showButton).hide();
      }else{
        DisplayProc(DISP.HIDE);
        $(this).text(BTN_DEL);
        GM_setValue(userName, "");
      }
    });

    //コメント一時表示ボタン処理
    $(showButton).click(function(){
      if ( $(this).text() == BTN_SHOW ){
        DisplayProc(DISP.SHOW);
      }else{
        DisplayProc(DISP.HIDE);
      }
    });

  });



  //初期化ボタン
  var initDiv = $("<div></div>", {text:"NGリスト初期化(現在の登録数:"+GM_listValues().length+")"});
  $(initDiv).css(initDivStyle);
  $("#soc_f").before(initDiv);
  $(initDiv).click(function(){
    if ( confirm(SCRIPT_NAME+"のNGユーザーリストを初期化しますか？") ){
      resetIgnoreSetting();
    }
  });



  //設定リセット
  function resetIgnoreSetting(){
    $.each(GM_listValues(), function(value,key){
      GM_deleteValue(key);
    });
    alert("初期化を完了しました");
  }

}) (jQuery);
