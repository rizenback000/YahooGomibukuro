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

(function($) {
  const PRODUCT = "YahooGomibukuro";
  const VER = "1.0.0a";
  const BTN_REG = "NG登録";
  const BTN_DEL = "NG解除";
  const BTN_SHOW = "一時表示";
  const BTN_HIDE = "閉じる";
  const NG_USER = "NGUser";
  const NG_ICON = "data:image/gif;base64,R0lGODlhMAARAIAAAAAAAP///yH5BAAAAAAALAAAAAAwABEAAAJbhI+py+0Po5y02ntCyFmjzRmaJ44gYH4nuIbiq5yfu7EoI9vx0r62PAuRgone7Vcy3jqrVDLnW8Kk1NI0CD1SlUBYdzlsTo1DLI/WYeZG6iZ7/MXI5/S6/W4vAAA7";

  var Util = {
    /**
     * MyData - data-{product}_dataNameの文字列生成
     *
     * @param  {string} dataName description
     * @return {type}          description
     */
    MyData: function(dataName) {
      return "data-" + PRODUCT + "_" + dataName;
    },

    /**
     * ConfirmRegExUser - 正規表現が正しくユーザ名と一致するかチェックして一致しなければ確認を求める
     *
     * @param  {string} patternName パターン
     * @param  {string} orgUserName テスト対象のユーザ名
     * @return {boolean}             一致すればtrue,一致しなければconfirmの戻り値
     */
    ConfirmRegExUser: function(patternName, orgUserName){
      var reg = new RegExp("^"+patternName+"$");
      console.log("ConfirmRegExUser="+patternName);
      if ( orgUserName.match(reg) ){
        return true;
      }else{
        return confirm("入力された設定パターン「"+patternName+"」はユーザ名「"+orgUserName+"」と一致しません。\n本当にこの設定に変更しますか？");
      }
    }

  };


  /**
   * NG前のユーザ、アイコンID
   */
  var Origin = {
    User: Util.MyData("orig-user"),
    Icon: Util.MyData("orig-icon")
  };


  /**
   * モーダルウィンドウのID
   */
  var MDID = {
    CONTENT: Util.MyData("modal-content"),
    HEADER: Util.MyData("modal-header"),
    NGLIST: Util.MyData("modal-nglist")
  };


  /**
   * NGProc - ユーザ名とNGリストが一致するものを非表示処理
   *
   * @param  {type} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {type}        description
   */
  function NGProc($usrNm) {
    $usrNm.find(".usrNm a").each(function() {
      var $user = $(this);
      var userName = $user.attr(Origin.User);

      var obj = GetGomiObjects($user);
      var $ansBody = obj.$AnsBody;
      var $avtr = obj.$Avtr;
      var $ignoreButton = obj.$IgnoreButton;
      var $showButton = obj.$ShowButton;

      console.log($ignoreButton);
      var ngMatchFlg = false;
      $.each(GM_listValues(), function(value, key) {
        if (userName.match(key)) {
          ngMatchFlg = true;
          return false;
        }
      });

      console.log(userName+":ngmatch="+ngMatchFlg);
      if (ngMatchFlg) {
        DisplayProc(false, $ignoreButton, BTN_DEL, $showButton, $ansBody, $user, $avtr);
      } else {
        DisplayProc(true, $ignoreButton, BTN_REG, $showButton, $ansBody, $user, $avtr);
      }
    });
  }


  /**
   * GetGomiObjects - $userオブジェクトを元に各jQueryオブジェクトを取得
   *
   * @param  {object} $user         usrNm a要素を含むDOMjQueryオブジェクト
   * @return {type}               description
   */
  function GetGomiObjects($user) {
    $ansBody = $($user.parents().next(".ptsQes"));
    $avtr = $user.parents(".usrQstn").prev().find("img");
    $ignButton = $user.parent().find("button:first");
    $shwButton = $ignButton.next();

    var ret = {
      $AnsBody: $ansBody,
      $Avtr: $avtr,
      $IgnoreButton: $ignButton,
      $ShowButton: $shwButton
    };
    return ret;
  }


  /**
   * CreateNGButton - すべての回答の下にコメント表示パネルを設置
   *
   * @param  {object} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {type}        description
   */
  function CreateNGButton($usrNm) {
    $usrNm.find(".usrNm a").each(function() {
      var $user = $(this);
      var userName = $user.text();
      var $ansBody = $user.parents().next(".ptsQes");
      var $avtr = $user.parents(".usrQstn").prev().find("img");
      //ボタン
      var $ignoreButton = $("<button />", {
        text: BTN_REG
      });
      var $showButton = $("<button />", {
        text: BTN_SHOW
      });
      $showButton.hide();

      $user.parent().append($ignoreButton);
      $user.parent().append($showButton);

      //一時表示用などに元のユーザ名とアイコン画像を保存しておく
      $user.attr(Origin.User, userName);
      $avtr.attr(Origin.Icon, $avtr.attr("src"));
      //NG登録・解除ボタン処理
      //未登録なら登録,登録済みなら削除
      $ignoreButton.click(function() {
        var orgUserName = $user.attr(Origin.User);
        if ($(this).text() == BTN_DEL) {
          //NG解除・編集モーダルを表示
          ShowNGEditWindow(orgUserName);
        } else {
          //NG登録処理
          userName = prompt("NG登録するユーザ名を入力してください(正規表現利用可)", orgUserName);
          if (userName != null && userName != "") {
            if (!Util.ConfirmRegExUser(userName, orgUserName)){
              return false;
            }
            GM_setValue(userName, "");
            //NGProc($user.parents(".usrQstn"));
            NGProc($("body"));
          }
        }
      });

      //コメント一時表示ボタン処理
      $showButton.click(function() {
        if ($(this).text() == BTN_SHOW) {
          DisplayProc(true, $ignoreButton, $ignoreButton.text(), $showButton, $ansBody, $user, $avtr);
        } else {
          DisplayProc(false, $ignoreButton, $ignoreButton.text(), $showButton, $ansBody, $user, $avtr);
        }
      });

    });
  }


  /**
   * DisplayProc - 一時表示・非表示の共通処理
   *
   * @param  {boolean} show       表示非表示
   * @param  {object} $ignoreBUtton ignoreButtonオブジェクト
   * @param, {string} ignoreText ignoreButtonのテキスト
   * @param  {object} $ansBody    ptsQesオブジェクト
   * @param  {object} $showButton 一時表示ボタン
   * @param  {object} $user       usrNM内のaオブジェクト
   * @param  {object} $avtr       avtrオブジェクト
   * @return {type}            description
   */
  function DisplayProc(show, $ignoreButton, ignoreText, $showButton, $ansBody, $user, $avtr) {
    var userName = $user.text();
    console.log("DisplayProc="+show)
    if (show == true) {
      //回答を開く
      $ansBody.show();
      $showButton.text(BTN_HIDE);
      $user.text($user.attr(Origin.User));
      $avtr.attr("src", $avtr.attr(Origin.Icon));
    } else {
      //回答を閉じる
      $ansBody.hide();
      $showButton.text(BTN_SHOW);
      $user.text(NG_USER);
      $avtr.attr("src", NG_ICON);
    }
    $ignoreButton.text(ignoreText);
    //NG解除時には一時表示ボタンを非表示に
    if (ignoreText == BTN_REG) {
      $showButton.hide();
    } else {
      $showButton.show();
    }
  }


  /**
   * GetMatchNGUser - NG設定に一致するNGキーの配列を返す
   *
   * @param  {string} userName テスト対象になるユーザ名
   * @return {type}          一致するキーの配列
   */
  function GetMatchNGUser(testUserName) {
    var matchAry = [];
    $.each(GM_listValues(), function(value, key) {
      var reg = new RegExp(key);
      if (testUserName.match(reg)) {
        matchAry.push(key);
      }
    });
    return matchAry;
  }


  /**
   * AppendNGListItems - NG設定に一致するキー一覧をNGリストに追加する
   *
   * @param  {string} testUserName テスト対象になるユーザ名
   * @return {type}          description
   */
  function AppendNGListItems(testUserName) {
    var matchAry = GetMatchNGUser(testUserName);
    var $mdNGList = $("#" + MDID.NGLIST);
    $mdNGList.children().remove();
    $(matchAry).each(function() {
      $mdNGList.append($("<option></option>", { text: this }));
    });
  }


  /**
   * ResetIgnoreSetting - 設定リセット
   *
   * @return {type}  description
   */
  function ResetIgnoreSetting() {
    $.each(GM_listValues(), function(value, key) {
      GM_deleteValue(key);
    });
  }


  /**
   * CreateInitButton - 初期化ボタンを生成
   *
   * @return {type}  description
   */
  function CreateInitButton() {
    var $initButton = $("<div></div>", {
      text: "NGリスト初期化(現在の登録数:" + GM_listValues().length + ")"
    });
    var initButtonStyle = {
      color: "#0",
      textShadow: "0 1px 2px #ffffff",
      borderRadius: "3px",
      backgroundColor: "#eaeaea",
      boxShadow: "0 1px 0 rgba(255, 255, 255, 0.3) inset,0 0 5px rgba(0, 0, 0, 0.3) inset,0 1px 2px rgba(0, 0, 0, 0.3)",
      padding: "5px 5px",
      cursor: "pointer",
      textAlign: "center"
    }

    $initButton.css(initButtonStyle);
    $("#soc_f").before($initButton);
    $initButton.click(function() {
      if (confirm(PRODUCT + "のNGユーザーリストを初期化しますか？\n(登録件数により時間がかかる場合があります)")) {
        alert("NGリストを初期化します。完了後に再度通知されます。");
        ResetIgnoreSetting();
        alert("NGリストの初期化を完了しました");
      }
    });
  }




  /**
   * CreateNGEditWindow - NG設定編集ウィンドウ作成
   *
   * @return {type}  description
   */
  function CreateNGEditWindow() {
    var cssModalContent = {
      margin: "0",
      padding: "0px",
      border: "2px solid #aaa",
      background: "rgba(0,0,0,128)",
      position: "fixed",
      display: "none",
      zIndex: "99",
      color: "#ffffff"
    };

    var cssModalHeader = {
      color: "#0",
      marginBottom: "5px",
      padding: "5px",
      background: "#000000",
      border: "1px solid"
    };


    var cssNGMatchList = {
      width: "100%"
    };

    var $modalContent = $("<div></div>", { id: MDID.CONTENT });
    var $modalHeader = $("<div></div>", { id: MDID.HEADER });
    var $ngMatchList = $("<select></select>", { id: MDID.NGLIST });
    var $ngUserDelButton = $("<button />", { text: "削除" });
    var $ngUserEditButton = $("<button />", { text: "編集" });
    var $modalCloseButton = $("<button />", { text: "閉じる" });
    $modalContent.css(cssModalContent);
    $modalHeader.css(cssModalHeader);
    $ngMatchList.css(cssNGMatchList);
    $modalContent.append($modalHeader);
    $modalContent.append($ngMatchList);
    $modalContent.append($ngUserDelButton);
    $modalContent.append($ngUserEditButton);
    $modalContent.append($modalCloseButton);
    $("body").append($modalContent);


    //閉じるボタン
    $modalCloseButton.click(function(){
      $modalContent.fadeOut("fast", function() {
        $modalContent.hide();
      });
    });

    //削除ボタン
    $ngUserDelButton.click(function() {
      var deleteUser = $ngMatchList.text();
      if (confirm("本当にこのNG設定を削除しますか？\n\n" + deleteUser)) {
        GM_deleteValue(deleteUser, "");
        $ngMatchList.children("option:selected").remove();
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger("click");
        }
        console.log("delete user:"+deleteUser);
        NGProc($("body"));
      }
    });

    //編集ボタン
    $ngUserEditButton.click(function() {
      var orgUserName = $modalContent.attr(Origin.User);
      var userName = prompt("変更後のNG設定を入力してください(正規表現利用可)", $ngMatchList.text());

      if (userName != "" && userName != null) {
        //入力されたユーザ名が一致するかチェック
        if ( !Util.ConfirmRegExUser(userName, orgUserName) ){
          return false;
        }
        //今の設定を削除後に入力された設定を追加することで編集
        GM_deleteValue($ngMatchList.text(), "");
        GM_setValue(userName, "");
        //表示中NG設定リストを更新
        AppendNGListItems(orgUserName);
        //一致するものが一つもなければモーダルを閉じる
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger("click");
        }
        NGProc($("body"));
      }
    });

  }


  /**
   * ShowNGEditWindow - NG設定編集ウィンドウの表示
   *
   * @param  {string} orgUserName 呼び出したユーザ名
   * @return {type}          description
   */
  function ShowNGEditWindow(orgUserName) {
    AppendNGListItems(orgUserName);
    CenteringModalSyncer();
    $("#" + MDID.CONTENT).fadeIn("fast");
    $("#" + MDID.CONTENT).attr(Origin.User, orgUserName);
    $("#" + MDID.HEADER).text("「"+orgUserName+"」と一致するNG登録一覧");
  }



  /**
   * CenteringModalSyncer - センタリングを実行する
   *
   * @return {type}  description
   */
  function CenteringModalSyncer() {

    //画面(ウィンドウ)の幅、高さを取得
    var w = $(window).width();
    var h = $(window).height();

    // コンテンツ(#modal-content)の幅、高さを取得
    // jQueryのバージョンによっては、引数[{margin:true}]を指定した時、不具合を起こします。
    //		var cw = $( "#modal-content" ).outerWidth( {margin:true} );
    //		var ch = $( "#modal-content" ).outerHeight( {margin:true} );
    var $mdContent = $("#" + MDID.CONTENT);
    var cw = $mdContent.outerWidth();
    var ch = $mdContent.outerHeight();

    //センタリングを実行する
    $mdContent.css({
      "left": ((w - cw) / 2) + "px",
      "top": ((h - ch) / 2) + "px"
    });

  }



  //監視
  var $obsTgt = $(".mdCmnt");
  $obsTgt.each(function() {
    var obsFlg = true;
    var obs = new MutationObserver(function(mutations) {
      $(mutations).each(function() {
        var $nodes = $(this.addedNodes[0]);
        CreateNGButton($nodes);
        NGProc($nodes);
        //続きを読むが無くなった時点でobserveを止める。どれだけの効果があるか知らんけれども
        if ($nodes.parent().find(".cmntMore:visible").length <= 0 && obsFlg) {
          obs.disconnect();
          obsFlg = false;
          console.log("observe disconnect")
        }
      });
    });

    var obsOptions = {
      attributes: false,
      childList: true,
      characterData: false
    };

    obs.observe(this, obsOptions);
  });

  $body = $("body");
  CreateNGButton($body);
  NGProc($body);
  CreateNGEditWindow();
  CreateInitButton();

})(jQuery);
