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
  const $mMngButton = createManageButton();
  const CONSTANT = {
    PRODUCT: 'YahooGomibukuro',
    VER: '1.1.0a',
    BTNTXT: {
      REG: 'NG登録',
      DEL: 'NG解除',
      SHOW: '一時表示',
      HIDE: '閉じる'
    },
    NGTXT:{
      USER: 'NGUser',
      ICON: 'data:image/gif;base64,R0lGODlhMAARAIAAAAAAAP///yH5BAAAAAAALAAAAAAwABEAAAJbhI+py+0Po5y02ntCyFmjzRmaJ44gYH4nuIbiq5yfu7EoI9vx0r62PAuRgone7Vcy3jqrVDLnW8Kk1NI0CD1SlUBYdzlsTo1DLI/WYeZG6iZ7/MXI5/S6/W4vAAA7'
    },
    MNG_WARNING_CNT:1000
  };

  const ENUM = {
    CONFIRM_RET:{
      MATCH: 1,
      CANCEL: 0,
      FORCE_YES: -1
    }
  };



  /**
   * confirmRegExUser - 正規表現が正しくユーザ名と一致するかチェックして一致しなければ確認を求める
   *
   * @param  {string} patternName パターン
   * @param  {string} orgUserName テスト対象のユーザ名
   * @return {boolean}             一致すればtrue,一致しなければconfirmの戻り値
   */
  function confirmRegExUser (patternName, orgUserName) {
    console.log('confirmRegExUser='+patternName);
    let reg = new RegExp('^'+patternName+'$');
    if ( orgUserName.match(reg) ) {
      return ENUM.CONFIRM_RET.MATCH;
    }else{
      if (confirm('入力された設定パターン「'+patternName+'」はユーザ名「'+orgUserName+'」と一致しません。\n'+'本当にこの設定に変更しますか？')) {
        return ENUM.CONFIRM_RET.FORCE_YES;
      }else{
        return ENUM.CONFIRM_RET.CANCEL;
      }
    }
  }


  //前は関数を参照させてたけど定義位置によって動かなくなっちゃうので直書き。もっと綺麗にできるはず。
  const ID = {
    ORIGIN:{
      USER: 'data-YahooGomibukuro_original-user',
      ICON: 'data-YahooGomibukuro_original-icon'
    },
    MODAL:{
      CONTENT:'id-YahooGomibukuro_modal-content',
      HEADER: 'id-YahooGomibukuro_modal-header',
      NGLIST: 'id-YahooGomibukuro_modal-nglist'
    }
  };



  /**
   * updateManageButtonText - 管理ボタンのテキストを更新
   *
   * @param  {object} $mngButton 管理ボタンオブジェクト
   * @return {void}        description
   */
  function updateManageButtonText($mngButton) {
    $mngButton.text('NGリスト管理(現在の登録数:' + GM_listValues().length + ')');
  }



  function manageHeaderText() {
    return 'NG登録一覧(登録数:'+GM_listValues().length+')';
  }


  /**
   * ngProc - ユーザ名とNGリストが一致するものを非表示処理
   *
   * @param  {object} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {void}        description
   */
  function ngProc($usrNm) {
    $usrNm.find('.usrNm a').each(function() {
      const $user = $(this);
      const userName = $user.attr(ID.ORIGIN.USER);

      const obj = getGomiObjects($user);
      const $ansBody = obj.$AnsBody;
      const $avtr = obj.$Avtr;
      const $ignoreButton = obj.$IgnoreButton;
      const $showButton = obj.$ShowButton;
      let ngMatchFlg = false;

      console.log($ignoreButton);
      $.each(GM_listValues(), function(value, key) {
        if (userName.match(key)) {
          ngMatchFlg = true;
          return false;
        }
      });

      console.log(userName+':ngmatch='+ngMatchFlg);
      if (ngMatchFlg) {
        displayProc(false, $ignoreButton, CONSTANT.BTNTXT.DEL, $showButton, $ansBody, $user, $avtr);
      } else {
        displayProc(true, $ignoreButton, CONSTANT.BTNTXT.REG, $showButton, $ansBody, $user, $avtr);
      }
    });
  }


  /**
   * GetGomiObjects - $userオブジェクトを元に各jQueryオブジェクトを取得
   *
   * @param  {object} $user         usrNm a要素を含むDOMjQueryオブジェクト
   * @return {object}               description
   */
  function getGomiObjects($user) {
    const $ansBody = $($user.parents().next('.ptsQes'));
    const $avtr = $user.parents('.usrQstn').prev().find('img');
    const $ignButton = $user.parent().find('button:first');
    const $shwButton = $ignButton.next();

    const ret = {
      $AnsBody: $ansBody,
      $Avtr: $avtr,
      $IgnoreButton: $ignButton,
      $ShowButton: $shwButton
    };

    return ret;
  }


  /**
   * createNGButton - すべての回答の下にコメント表示パネルを設置
   *
   * @param  {object} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {void}        description
   */
  function createNGButton($usrNm) {
    $usrNm.find('.usrNm a').each(function() {
      const $user = $(this);
      let userName = $user.text();
      const $ansBody = $user.parents().next('.ptsQes');
      const $avtr = $user.parents('.usrQstn').prev().find('img');
      //ボタン
      const $ignoreButton = $('<button />', { text: CONSTANT.BTNTXT.REG });
      const $showButton = $('<button />', { text: CONSTANT.BTNTXT.SHOW });
      $showButton.hide();

      $user.parent().append($ignoreButton);
      $user.parent().append($showButton);

      //一時表示用などに元のユーザ名とアイコン画像を保存しておく
      $user.attr(ID.ORIGIN.USER, userName);
      $avtr.attr(ID.ORIGIN.ICON, $avtr.attr('src'));

      //NG登録・解除ボタン処理
      //未登録なら登録,登録済みなら削除
      $ignoreButton.click(function() {
        let orgUserName = $user.attr(ID.ORIGIN.USER);
        if ($(this).text() == CONSTANT.BTNTXT.DEL) {
          //NG解除・編集モーダルを表示
          showNGEditWindow(orgUserName, false);
        } else {
          //NG登録処理
          userName = prompt('NG登録するユーザ名を入力してください(正規表現利用可)', orgUserName);
          console.log(userName);
          if (userName != null && userName != '') {
            const ret = confirmRegExUser(userName, orgUserName);
            if (ret == ENUM.CONFIRM_RET.CANCEL) {
              return false;
            }
            GM_setValue(userName, '');
            ngProc($('body'));
            updateManageButtonText($mMngButton);
          }
        }
      });

      //コメント一時表示ボタン処理
      $showButton.click(function() {
        if ($(this).text() == CONSTANT.BTNTXT.SHOW) {
          displayProc(true, $ignoreButton, $ignoreButton.text(), $showButton, $ansBody, $user, $avtr);
        } else {
          displayProc(false, $ignoreButton, $ignoreButton.text(), $showButton, $ansBody, $user, $avtr);
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
   * @return {void}            description
   */
  function displayProc(show, $ignoreButton, ignoreText, $showButton, $ansBody, $user, $avtr) {
    console.log('DisplayProc='+show);
    if (show == true) {
      //回答を開く
      $ansBody.show();
      $showButton.text(CONSTANT.BTNTXT.HIDE);
      $user.text($user.attr(ID.ORIGIN.USER));
      $avtr.attr('src', $avtr.attr(ID.ORIGIN.ICON));
    } else {
      //回答を閉じる
      $ansBody.hide();
      $showButton.text(CONSTANT.BTNTXT.SHOW);
      $user.text(CONSTANT.NGTXT.USER);
      console.log($avtr);
      $avtr.attr('src', CONSTANT.NGTXT.ICON);
    }
    $ignoreButton.text(ignoreText);
    //NG解除時には一時表示ボタンを非表示に
    if (ignoreText == CONSTANT.BTNTXT.REG) {
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
   * @return {void}          一致するキーの配列
   */
  function getMatchNGUser(testUserName, getall) {
    const matchAry = [];
    if (getall) {
      //全取得
      $.each(GM_listValues(), function(value, key) {
        matchAry.push(key);
      });
    }else{
      //正規表現に一致するものだけ
      $.each(GM_listValues(), function(value, key) {
        const reg = new RegExp(key);
        if (testUserName.match(reg)) {
          matchAry.push(key);
        }
      });
    }
    return matchAry;
  }


  /**
   * appendNGListItems - NG設定に一致するキー一覧をNGリストに追加する
   *
   * @param  {string} testUserName テスト対象になるユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {number}          一致する要素数
   */
  function appendNGListItems(testUserName, getall) {
    const matchAry = getMatchNGUser(testUserName, getall);
    const $mdNGList = $('#' + ID.MODAL.NGLIST);
    $mdNGList.children().remove();
    $(matchAry).each(function() {
      $mdNGList.append($('<option></option>', { text: this }));
    });
    return matchAry.length;
  }


  /**
   * CreateManageButton - 初期化ボタンを生成
   *
   * @return {object}  作成したボタンのjqueryオブジェクト
   */
  function createManageButton() {
    const $mngPanel = $('<div></div>', { style: 'text-align:center; margin-bottom:1em;'} );
    const $mngButton = $('<button />', { text: 'test', style:'width:100%' });
    $mngPanel.append($mngButton);
    $('#soc_f').before($mngPanel);
    $mngButton.click(function() {
      //1000件を超える場合は時間がかかる旨を表示する
      if (GM_listValues().length > CONSTANT.MNG_WARNING_CNT) {
        if ( !confirm('NG登録数が多いため管理ウィンドウの表示に時間がかかる場合があります\n表示してよろしいですか？') ) {
          return false;
        }
      }
      showNGEditWindow('全ユーザ取得だからここは関係ない', true);

    });
    updateManageButtonText($mngButton);
    return $mngButton;
  }


  /**
   * createNGEditWindow - NG設定編集ウィンドウ作成
   *
   * @return {void}  description
   */
  function createNGEditWindow() {
    const cssModalContent = {
      margin: '0',
      padding: '0px',
      border: '2px solid #aaa',
      background: 'rgba(0,0,0,128)',
      position: 'fixed',
      display: 'none',
      zIndex: '99',
      color: '#ffffff'
    };

    const cssModalHeader = {
      color: '#0',
      marginBottom: '5px',
      padding: '5px',
      background: '#000000',
      border: '1px solid'
    };


    const cssNGMatchList = {
      width: '100%'
    };

    const $modalOverlay = $('');
    const $modalContent = $('<div></div>', { id: ID.MODAL.CONTENT });
    const $modalHeader = $('<div></div>', { id: ID.MODAL.HEADER });
    const $ngMatchList = $('<select></select>', { id: ID.MODAL.NGLIST, size: '6', multiple: true });
    const $ngUserDelButton = $('<button />', { text: '削除' });
    const $ngUserEditButton = $('<button />', { text: '編集', disabled:true });
    const $modalCloseButton = $('<button />', { text: '閉じる' });
    $modalContent.css(cssModalContent);
    $modalHeader.css(cssModalHeader);
    $ngMatchList.css(cssNGMatchList);
    $modalContent.append($modalHeader);
    $modalContent.append($ngMatchList);
    $modalContent.append($ngUserDelButton);
    $modalContent.append($ngUserEditButton);
    $modalContent.append($modalCloseButton);
    $('body').append($modalContent);


    //閉じるボタン
    $modalCloseButton.click(function() {
      $modalContent.fadeOut('fast', function() {
        $modalContent.hide();
      });
    });

    //削除ボタン
    $ngUserDelButton.click(function() {
      const $selectedOption = $ngMatchList.children('option:selected');
      const delTgtAry = [];
      const SHOW_MAX = 4;
      let confirmText = '選択中のNG設定を削除しますか？\n\n';
      let delCnt = 0;

      if ($selectedOption.length <= 0) {
        alert('削除対象を1つ以上選択してください。');
        return false;
      }else{

        $selectedOption.each(function () {
          const key = $(this).text();
          console.log(key);
          delTgtAry.push(key);
          if (delCnt < SHOW_MAX) {
            confirmText = confirmText + key + '\n'
          }
          delCnt++;
        });

        //選択されたものを一部だけ表示、それ以上は省略
        if (delCnt > SHOW_MAX) {
          confirmText = confirmText + 'その他(全'+delTgtAry.length+'件)\n';
          confirmText = confirmText + '\n複数件の削除にはしばらく時間がかかる場合があります。';
        }
      }

      if (confirm(confirmText)) {
        if (delCnt > SHOW_MAX) alert('削除を開始します。削除完了後に再度通知されます。');
        delTgtAry.forEach(function (key) {
          GM_deleteValue(key);
        });

        //削除後も設定が存在する場合は閉じずに描画し直す
        $selectedOption.remove();
        if (delCnt > SHOW_MAX) alert('選択したNG設定の削除を完了しました。');
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger('click');
        }
        $modalHeader.text(manageHeaderText());
        ngProc($('body'));
        updateManageButtonText($mMngButton);
      }
    });


    //編集ボタン
    $ngUserEditButton.click(function() {
      const orgUserName = $modalContent.attr(ID.ORIGIN.USER);
      const $selectedOption = $ngMatchList.children('option:selected');
      const selectName = $selectedOption.text();
      const changedName = prompt('変更後のNG設定を入力してください(正規表現利用可)', selectName);

      if (changedName != '' && changedName != null) {
        //入力されたユーザ名が一致するかチェック
        let ret;
        if (orgUserName != '') {
          ret = confirmRegExUser(changedName, orgUserName);
          if ( ret == ENUM.CONFIRM_RET.CANCEL ) {
            return false;
          }
        }else{
          ret = ENUM.CONFIRM_RET.MATCH;
        }
        //今の設定を削除後に入力された設定を追加することで編集
        GM_deleteValue(selectName);
        GM_setValue(changedName, '');

        //パターンマッチしているときだけ表示中の設定リストを更新
        if (ret == ENUM.CONFIRM_RET.MATCH) {
          $selectedOption.text(changedName);
        }else{
          $selectedOption.remove();
        }

        //一致するものが一つもなければモーダルを閉じる
        if ($ngMatchList.children().length <= 0) {
          $modalCloseButton.trigger('click');
        }
        ngProc($('body'));
      }
    });


    //NGリスト
    $ngMatchList.change(function() {
      //1つ以上の選択時には編集ボタン無効(面倒だから複数編集には対応しない)
      console.log('change');
      if ($ngMatchList.children('option:selected').length == 1) {
        $ngUserEditButton.attr('disabled', false);
      }else{
        $ngUserEditButton.attr('disabled', true);
      }
    });

  }


  /**
   * ShowNGEditWindow - NG設定編集ウィンドウの表示
   *
   * @param  {string} orgUserName 呼び出したユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {void}          description
   */
  function showNGEditWindow(orgUserName, getall) {
    const $mdContent = $('#'+ID.MODAL.CONTENT);
    const $mdHeader = $('#'+ID.MODAL.HEADER);

    appendNGListItems(orgUserName, getall);
    centeringModalSyncer();
    $mdContent.fadeIn('fast');

    if (getall) {
      $mdContent.attr(ID.ORIGIN.USER, "");
      $mdHeader.text(manageHeaderText());
    }else{
      $mdContent.attr(ID.ORIGIN.USER, orgUserName);
      $mdHeader.text('「'+orgUserName+'」と一致するNG登録一覧');
    }
  }



  /**
   * CenteringModalSyncer - センタリングを実行する
   *
   * @return {void}  description
   */
  function centeringModalSyncer() {

    //画面(ウィンドウ)の幅、高さを取得
    const w = $(window).width();
    const h = $(window).height();

    // コンテンツ(#modal-content)の幅、高さを取得
    // jQueryのバージョンによっては、引数[{margin:true}]を指定した時、不具合を起こします。
    //		var cw = $( '#modal-content' ).outerWidth( {margin:true} );
    //		var ch = $( '#modal-content' ).outerHeight( {margin:true} );
    const $mdContent = $('#' + ID.MODAL.CONTENT);
    const cw = $mdContent.outerWidth();
    const ch = $mdContent.outerHeight();

    //センタリングを実行する
    $mdContent.css({
      'left': ((w - cw) / 2) + 'px',
      'top': ((h - ch) / 2) + 'px'
    });

  }


  /**
   * ReadMoreObserver - 返信を表示などの続きを読むボタンを監視してクリック時にNG適用する
   *
   * @return {void}  description
   */
  function ReadMoreObserver() {
    //監視
    const $obsTgt = $('.mdCmnt');
    $obsTgt.each(function() {
      let obsContinue = true;
      const obs = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          const $nodes = $(mutation.addedNodes[0]);
          createNGButton($nodes);
          ngProc($nodes);
          //続きを読むが無くなった時点でobserveを止める
          if ($nodes.parent().find('.cmntMore:visible').length <= 0 && obsContinue) {
            obs.disconnect();
            obsContinue = false;
            console.log('observe disconnect');
          }
        });
      });

      const obsOptions = {
        attributes: false,
        childList: true,
        characterData: false
      };
      obs.observe(this, obsOptions);
    });
  }

(function(){

})
  const $body = $('body');
  createNGButton($body);
  ngProc($body);
  createNGEditWindow();
  ReadMoreObserver();
  $(window).resize(centeringModalSyncer);

})(jQuery);
