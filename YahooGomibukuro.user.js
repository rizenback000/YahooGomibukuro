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
  const VER = "1.1.0a";
  const BTN_REG = "NG登録";
  const BTN_DEL = "NG解除";
  const BTN_SHOW = "一時表示";
  const BTN_HIDE = "閉じる";
  const NG_USER = "NGUser";
  const NG_ICON = "data:image/gif;base64,R0lGODlhMAARAIAAAAAAAP///yH5BAAAAAAALAAAAAAwABEAAAJbhI+py+0Po5y02ntCyFmjzRmaJ44gYH4nuIbiq5yfu7EoI9vx0r62PAuRgone7Vcy3jqrVDLnW8Kk1NI0CD1SlUBYdzlsTo1DLI/WYeZG6iZ7/MXI5/S6/W4vAAA7";
  const ManageHeaderText = function(itemCnt){
    return "NG登録一覧(登録数:"+itemCnt+")";
  };

  var $mMngButton;

  var Util = {
    ConfirmRet:{
      MATCH:1,
      CANCEL:0,
      FORCE_YES:-1
    },
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
        return Util.ConfirmRet.MATCH;
      }else{
        if (confirm("入力された設定パターン「"+patternName+"」はユーザ名「"+orgUserName+"」と一致しません。\n本当にこの設定に変更しますか？")){
          return Util.ConfirmRet.FORCE_YES;
        }else{
          return Util.ConfirmRet.CANCEL;
        }
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


  function UpdateManageButtonText($mngButton){
    $mngButton.text("NGリスト管理(現在の登録数:" + GM_listValues().length + ")");
  }

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
          ShowNGEditWindow(orgUserName, false);
        } else {
          //NG登録処理
          userName = prompt("NG登録するユーザ名を入力してください(正規表現利用可)", orgUserName);
          if (userName != null && userName != "") {
            var ret = Util.ConfirmRegExUser(userName, orgUserName);
            console.log(ret);
            if (ret == Util.ConfirmRet.CANCEL){
              return false;
            }
            GM_setValue(userName, "");
            //NGProc($user.parents(".usrQstn"));
            NGProc($("body"));
            UpdateManageButtonText($mMngButton);
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
   * @param  {string} testUserName テスト対象になるユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {type}          一致するキーの配列
   */
  function GetMatchNGUser(testUserName, getall) {
    var matchAry = [];
    if (getall){
      //全取得
      $.each(GM_listValues(), function(value, key){
        matchAry.push(key);
      });
    }else{
      //正規表現に一致するものだけ
      $.each(GM_listValues(), function(value, key) {
        var reg = new RegExp(key);
        if (testUserName.match(reg)) {
          matchAry.push(key);
        }
      });
    }
    return matchAry;
  }


  /**
   * AppendNGListItems - NG設定に一致するキー一覧をNGリストに追加する
   *
   * @param  {string} testUserName テスト対象になるユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {number}          一致する要素数
   */
  function AppendNGListItems(testUserName, getall) {
    var matchAry = GetMatchNGUser(testUserName, getall);
    var $mdNGList = $("#" + MDID.NGLIST);
    $mdNGList.children().remove();
    $(matchAry).each(function() {
      $mdNGList.append($("<option></option>", { text: this }));
    });
    return matchAry.length;
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
   * CreateManageButton - 初期化ボタンを生成
   *
   * @return {type}  description
   */
  function CreateManageButton() {
    const WARN_CNT = 1000;

    var $initPanel = $("<div></div>", { style: "text-align:center; margin-bottom:1em;"} );
    var $initButton = $("<button />", { text: "test", style:"width:100%" });
    $initPanel.append($initButton);
    $("#soc_f").before($initPanel);
    $initButton.click(function() {
      //1000件を超える場合は時間がかかる旨を表示する
      if (GM_listValues().length > WARN_CNT){
        if ( !confirm("NG登録数が多いため管理ウィンドウの表示に時間がかかる場合があります\n表示してよろしいですか？") ){
          return false;
        }
      }
      ShowNGEditWindow("全ユーザ取得だからここは関係ない", true);

    });
    UpdateManageButtonText($initButton);
    return $initButton;
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
    var $modalOverlay = $("");
    var $modalContent = $("<div></div>", { id: MDID.CONTENT });
    var $modalHeader = $("<div></div>", { id: MDID.HEADER });
    var $ngMatchList = $("<select></select>", { id: MDID.NGLIST, size: "6", multiple: true });
    var $ngUserDelButton = $("<button />", { text: "削除" });
    var $ngUserEditButton = $("<button />", { text: "編集", disabled:true });
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
      var $selectedOption = $ngMatchList.children("option:selected");
      var confirmText = "選択中のNG設定を削除しますか？\n\n";
      var delTgtAry = [];
      const SHOW_CNT = 4;
      var cnt = 0;

      if ($selectedOption.length <= 0){
        alert("削除対象を1つ以上選択してください。");
        return false;
      }else{

        $selectedOption.each(function (){
          var key = $(this).text();
          console.log(key);
          delTgtAry.push(key);
          if (cnt < SHOW_CNT){
            confirmText = confirmText + key + "\n"
          }
          cnt++;
        });

        //選択されたものを一部だけ表示、それ以上は省略
        if (cnt > SHOW_CNT){
          confirmText = confirmText + "その他(全"+delTgtAry.length+"件)\n";
          confirmText = confirmText + "\n複数件の削除にはしばらく時間がかかる場合があります。";
        }
      }

      if (confirm(confirmText)) {
        if (cnt > SHOW_CNT) alert("削除を開始します。削除完了後に再度通知されます。");
        delTgtAry.forEach(function (key){
          GM_deleteValue(key);
        });

        //削除後も設定が存在する場合は閉じずに描画し直す
        $selectedOption.remove();
        if (cnt > SHOW_CNT) alert("選択したNG設定の削除を完了しました。");
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger("click");
        }
        $modalHeader.text(ManageHeaderText($ngMatchList.children().length));
        NGProc($("body"));
        UpdateManageButtonText($mMngButton);
      }
    });


    //編集ボタン
    $ngUserEditButton.click(function() {
      var orgUserName = $modalContent.attr(Origin.User);
      var $selectedOption = $ngMatchList.children("option:selected");
      var selectName = $selectedOption.text();
      var changedName = prompt("変更後のNG設定を入力してください(正規表現利用可)", selectName);

      if (changedName != "" && changedName != null) {
        //入力されたユーザ名が一致するかチェック
        var ret = Util.ConfirmRegExUser(changedName, orgUserName);
        if ( ret == Util.ConfirmRet.CANCEL ){
          return false;
        }
        //今の設定を削除後に入力された設定を追加することで編集
        GM_deleteValue($ngMatchList.text());
        GM_setValue(changedName, "");

        //パターンマッチしているときだけ表示中の設定リストを更新
        if (ret == Util.ConfirmRet.MATCH){
          $selectedOption.text(changedName);
        }else{
          $selectedOption.remove();
        }

        //一致するものが一つもなければモーダルを閉じる
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger("click");
        }
        NGProc($("body"));
      }
    });


    //NGリスト
    $ngMatchList.change(function(){
      //1つ以上の選択時には編集ボタン無効(面倒だから複数編集には対応しない)
      console.log("change");
      if ($ngMatchList.children("option:selected").length == 1){
        $ngUserEditButton.attr("disabled", false);
      }else{
        $ngUserEditButton.attr("disabled", true);
      }
    });

  }


  /**
   * ShowNGEditWindow - NG設定編集ウィンドウの表示
   *
   * @param  {string} orgUserName 呼び出したユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {type}          description
   */
  function ShowNGEditWindow(orgUserName, getall) {
    var itemCnt = AppendNGListItems(orgUserName, getall);
    CenteringModalSyncer();
    var $mdContent = $("#"+MDID.CONTENT);
    var $mdHeader = $("#"+MDID.HEADER);
    $mdContent.fadeIn("fast");
    if (getall){
      $mdHeader.text(ManageHeaderText(itemCnt));
    }else{
      $mdContent.attr(Origin.User, orgUserName);
      $mdHeader.text("「"+orgUserName+"」と一致するNG登録一覧");
    }
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

  console.log("awe");
  $body = $("body");
  console.log("awe2");
  CreateNGButton($body);
  console.log("awe3");
  NGProc($body);
  CreateNGEditWindow();
  $mMngButton = CreateManageButton();
  $(window).resize(CenteringModalSyncer);

})(jQuery);
