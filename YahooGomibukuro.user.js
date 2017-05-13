// ==UserScript==
// @name            YahooGomibukuro
// @namespace       https://github.com/rizenback000/YahooGomibukuro
// @description     頭の中ハッピーセットの回答者をNG
// @version         1.1.0b
// @include         https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/*
// @require         http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_listValues
// ==/UserScript==

(function($) {
  const CONSTANT = {
    BTNTXT: {
      REG: 'NG登録',
      DEL: 'NG解除',
      SHOW: '一時表示',
      HIDE: '閉じる'
    },
    NGTXT:{
      USER: 'NGUser',
      ICON: 'data:image/gif;base64,R0lGODlhMAARAIAAAAAAAP///yH5BAAAAAAALAAAAAAwABEAAAJbhI+py+0Po5y02ntCyFmjzRmaJ44gYH4nuIbiq5yfu7EoI9vx0r62PAuRgone7Vcy3jqrVDLnW8Kk1NI0CD1SlUBYdzlsTo1DLI/WYeZG6iZ7/MXI5/S6/W4vAAA7'
    }
  };

  const ID = {
    ORIGIN:{
      USER: 'data-YahooGomibukuro_original-user',
      ICON: 'data-YahooGomibukuro_original-icon'
    },
    MANAGE:{
      CONTENT:'id-YahooGomibukuro_manage-content',
      HEADER: 'id-YahooGomibukuro_manage-header',
      NGLIST: 'id-YahooGomibukuro_manage-nglist'
    }
  };

  const $mMngPanel = $('<div></div>', { style: 'text-align:center; margin-bottom:1em;'} );
  const $mMngButton = $('<button />', { text: 'test', style:'width:100%' });
  //const $mManageOverlay = $('');
  const $mManageContent = $('<div></div>', { id: ID.MANAGE.CONTENT });
  const $mManageHeader = $('<div></div>', { id: ID.MANAGE.HEADER });
  const $mNgMatchList = $('<select></select>', { id: ID.MANAGE.NGLIST, size: '6', multiple: true });
  const $mNgDelButton = $('<button />', { text: '削除' });
  const $mNgEditButton = $('<button />', { text: '編集', disabled:true });
  const $mManageCloseButton = $('<button />', { text: '閉じる' });


  /**
   *   正規表現が正しくユーザ名と一致するかチェックして一致しなければ確認を求める
   */
  const confirmRegEx = {
    CONFIRM_RET:{
      MATCH: 1,
      CANCEL: 0,
      FORCE_YES: -1
    },
    /**
     * check - ダイアログを表示
     *
     * @param  {string} patternName パターン
     * @param  {string} testName テスト対象のユーザ名
     * @return {boolean}             一致すればtrue,一致しなければconfirmの戻り値
     */
    check : function(patternName, testName) {
      console.log('confirmRegEx='+patternName);
      let reg = new RegExp('^'+patternName+'$');
      if ( testName.match(reg) ) {
        return confirmRegEx.CONFIRM_RET.MATCH;
      }else{
        if ( confirm('入力された設定パターン「'+patternName+'」はユーザ名「'+testName+'」と一致しません。\n'+'本当にこの設定に変更しますか？') ) {
          return confirmRegEx.CONFIRM_RET.FORCE_YES;
        }else{
          return confirmRegEx.CONFIRM_RET.CANCEL;
        }
      }
    }
  };


  /* 初期処理系 */

  /**
   * createNGButton - すべての回答の下にコメント表示パネルを設置
   *
   * @param  {object} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {void}        description
   */
  function createNGButton($usrNm) {
    $usrNm.find('.usrNm a').each(function() {
      const $user = $(this);
      const obj = getGomiObjects($user);
      const $ansBody = obj.$AnsBody;
      const $avtr = obj.$Avtr;
      //ボタン
      const $ngButton = $('<button />', { text: CONSTANT.BTNTXT.REG });
      const $showButton = $('<button />', { text: CONSTANT.BTNTXT.SHOW });

      $showButton.hide();

      $user.parent().append($ngButton);
      $user.parent().append($showButton);

      //一時表示用などに元のユーザ名とアイコン画像を保存しておく
      $user.attr(ID.ORIGIN.USER, $user.text());
      $avtr.attr(ID.ORIGIN.ICON, $avtr.attr('src'));

      //NG登録・解除ボタン処理
      //未登録なら登録,登録済みなら削除
      $ngButton.click(function() {
        let orgUserName = $user.attr(ID.ORIGIN.USER);
        if ($(this).text() == CONSTANT.BTNTXT.DEL) {
          //NG解除・編集モーダルを表示
          showManageWindow(orgUserName, false);
        } else {
          //NG登録処理
          const inputName = prompt('NG登録するユーザ名を入力してください(正規表現利用可)', orgUserName);
          if (inputName != null && inputName != '') {
            const ret = confirmRegEx.check(inputName, orgUserName);
            if (ret == confirmRegEx.CONFIRM_RET.CANCEL) {
              return false;
            }
            GM_setValue(inputName, '');
            updateManageButtonText();
            ngProc($('body'));
          }
        }
      });

      //コメント一時表示ボタン処理
      $showButton.click(function() {
        if ($(this).text() == CONSTANT.BTNTXT.SHOW) {
          displayProc(true, $ngButton, $ngButton.text(), $showButton, $ansBody, $user, $avtr);
        } else {
          displayProc(false, $ngButton, $ngButton.text(), $showButton, $ansBody, $user, $avtr);
        }
      });

    });
  }


  /* 主処理*/

  /**
   * ngProc - ユーザ名とNGリストが一致するものを非表示処理
   *
   * @param  {object} $usrNm usrNm a要素を含むDOMjQueryオブジェクト
   * @return {void}        description
   */
  function ngProc($usrNm) {
    $usrNm.find('.usrNm a').each(function() {
      const $user = $(this);
      const obj = getGomiObjects($user);
      const $ansBody = obj.$AnsBody;
      const $avtr = obj.$Avtr;
      const $ngButton = obj.$NgButton;
      const $showButton = obj.$ShowButton;
      const userName = $user.attr(ID.ORIGIN.USER);
      let ngMatchFlg = false;

      $.each(GM_listValues(), function(value, key) {
        if (userName.match(key)) {
          ngMatchFlg = true;
          return false;
        }
      });

      console.log(userName+':ngmatch='+ngMatchFlg);
      if (ngMatchFlg) {
        displayProc(false, $ngButton, CONSTANT.BTNTXT.DEL, $showButton, $ansBody, $user, $avtr);
      } else {
        displayProc(true, $ngButton, CONSTANT.BTNTXT.REG, $showButton, $ansBody, $user, $avtr);
      }
    });
  }

  /**
   * DisplayProc - 一時表示・非表示の共通処理
   *
   * @param  {boolean} show       表示非表示
   * @param  {object} $ngButton ngButtonオブジェクト
   * @param, {string} ngBtnText ngButtonのテキスト
   * @param  {object} $ansBody    ptsQesオブジェクト
   * @param  {object} $showButton 一時表示ボタン
   * @param  {object} $user       usrNM内のaオブジェクト
   * @param  {object} $avtr       avtrオブジェクト
   * @return {void}            description
   */
  function displayProc(show, $ngButton, ngBtnText, $showButton, $ansBody, $user, $avtr) {
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
      $avtr.attr('src', CONSTANT.NGTXT.ICON);
    }
    $ngButton.text(ngBtnText);
    //NG解除時には一時表示ボタンを非表示に
    if (ngBtnText == CONSTANT.BTNTXT.REG) {
      $showButton.hide();
    } else {
      $showButton.show();
    }
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
      $NgButton: $ignButton,
      $ShowButton: $shwButton
    };

    return ret;
  }

  /**
   * getMatchNGUser - NG設定に一致するNGキーの配列を返す
   *
   * @param  {string} testUserName テスト対象になるユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {void}          一致するキーの配列
   */
  function getMatchNGUser(testUserName, getall) {
    const matchAry = [];
    //全取得フラグがtrueならtestUserNameの値は無視する
    if (getall) {
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
   * ReadMoreObserver - 返信を表示などの続きを読むボタンを監視してクリック時にNG適用する
   *
   * @return {void}  description
   */
  function readMoreObserver() {
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


  /* 管理ウィンドウ系 */

  /**
   * createManageButton - 初期化ボタンを生成
   *
   * @return {void}
   */
  function createManageButton() {
    const MNG_WARNING_CNT = 1000;

    $mMngPanel.append($mMngButton);
    $('#soc_f').before($mMngPanel);
    $mMngButton.click(function() {
      //1000件を超える場合は時間がかかる旨を表示する
      if (GM_listValues().length > MNG_WARNING_CNT) {
        if ( !confirm('NG登録数が多いため管理ウィンドウの表示に時間がかかる場合があります\n表示してよろしいですか？') ) {
          return false;
        }
      }
      showManageWindow('全ユーザ取得だからここは関係ない', true);
    });
    updateManageButtonText();
  }

  /**
   * createManageWindow - NG設定編集ウィンドウ作成
   *
   * @return {void}  description
   */
  function createManageWindow() {
    const cssManageContent = {
      margin: '0',
      padding: '0px',
      border: '2px solid #aaa',
      background: 'rgba(0,0,0,128)',
      position: 'fixed',
      display: 'none',
      zIndex: '99',
      color: '#ffffff'
    };

    const cssManageHeader = {
      color: '#0',
      marginBottom: '5px',
      padding: '5px',
      background: '#000000',
      border: '1px solid'
    };


    const cssNGMatchList = {
      width: '100%'
    };


    $mManageContent.css(cssManageContent);
    $mManageHeader.css(cssManageHeader);
    $mNgMatchList.css(cssNGMatchList);
    $mManageContent.append($mManageHeader);
    $mManageContent.append($mNgMatchList);
    $mManageContent.append($mNgDelButton);
    $mManageContent.append($mNgEditButton);
    $mManageContent.append($mManageCloseButton);
    $('body').append($mManageContent);


    //閉じるボタン
    $mManageCloseButton.click(function() {
      $mManageContent.fadeOut('fast', function() {
        $mManageContent.hide();
      });
    });

    //削除ボタン
    $mNgDelButton.click(function() {
      const $selectedOption = $mNgMatchList.children('option:selected');
      const delTgtAry = [];
      const SHOW_MAX = 4;
      let confirmText = '選択中のNG設定を削除しますか？\n\n';

      if ($selectedOption.length <= 0) {
        alert('削除対象を1つ以上選択してください。');
        return false;
      }else{

        $selectedOption.each(function () {
          const key = $(this).text();
          delTgtAry.push(key);
          if (delTgtAry.length < SHOW_MAX) {
            confirmText = confirmText + key + '\n'
          }
        });

        //選択されたものを一部だけ表示、それ以上は省略
        if (delTgtAry.length > SHOW_MAX) {
          confirmText = confirmText + 'その他(全'+delTgtAry.length+'件)\n';
          confirmText = confirmText + '\n複数件の削除にはしばらく時間がかかる場合があります。';
        }
      }

      if ( confirm(confirmText) ) {
        if (delTgtAry.length > SHOW_MAX) alert('削除を開始します。削除完了後に再度通知されます。');
        delTgtAry.forEach(function (key) {
          GM_deleteValue(key);
        });

        //削除後も設定が存在する場合は閉じずに描画し直す
        $selectedOption.remove();
        if (delTgtAry.length > SHOW_MAX) alert('選択したNG設定の削除を完了しました。');
        if ($mNgMatchList.children().length <= 0) {
          $mManageCloseButton.trigger('click');
        }
        updateManageHeaderText.all();
        updateManageButtonText();
        ngProc($('body'));
      }
    });


    //編集ボタン
    $mNgEditButton.click(function() {
      const orgUserName = $mManageContent.attr(ID.ORIGIN.USER);
      const $selectedOption = $mNgMatchList.children('option:selected');
      const selectName = $selectedOption.text();
      const changedName = prompt('変更後のNG設定を入力してください(正規表現利用可)', selectName);

      if (changedName != '' && changedName != null) {
        //入力されたユーザ名が一致するかチェック
        let ret;
        if (orgUserName != '') {
          ret = confirmRegEx.check(changedName, orgUserName);
          if ( ret == confirmRegEx.CONFIRM_RET.CANCEL ) {
            return false;
          }
        }else{
          ret = confirmRegEx.CONFIRM_RET.MATCH;
        }
        //今の設定を削除後に入力された設定を追加することで編集
        GM_deleteValue(selectName);
        GM_setValue(changedName, '');

        //パターンマッチしているときだけ表示中の設定リストを更新
        if (ret == confirmRegEx.CONFIRM_RET.MATCH) {
          $selectedOption.text(changedName);
        }else{
          $selectedOption.remove();
        }

        //一致するものが一つもなければモーダルを閉じる
        if ($mNgMatchList.children().length <= 0) {
          $mManageCloseButton.trigger('click');
        }
        ngProc($('body'));
      }
    });


    //NGリスト
    $mNgMatchList.change(function() {
      //1つ以上の選択時には編集ボタン無効(面倒だから複数編集には対応しない)
      if ($mNgMatchList.children('option:selected').length == 1) {
        $mNgEditButton.attr('disabled', false);
      }else{
        $mNgEditButton.attr('disabled', true);
      }
    });

  }

  /**
   * showManageWindow - NG設定編集ウィンドウの表示
   *
   * @param  {string} orgUserName 呼び出したユーザ名
   * @param  {boolean} getall テスト対象に関わらず全設定を取得する
   * @return {void}          description
   */
  function showManageWindow(orgUserName, getall) {
    const matchAry = getMatchNGUser(orgUserName, getall);
    $mNgMatchList.children().remove();
    $(matchAry).each(function() {
      $mNgMatchList.append($('<option></option>', { text: this }));
    });

    centeringManageSyncer();
    $mManageContent.fadeIn('fast');

    if (getall) {
      $mManageContent.attr(ID.ORIGIN.USER, "");
      updateManageHeaderText.all();
    }else{
      $mManageContent.attr(ID.ORIGIN.USER, orgUserName);
      updateManageHeaderText.part(orgUserName);
    }
  }

  /**
   * CenteringManageSyncer - センタリングを実行する
   *
   * @return {void}  description
   */
  function centeringManageSyncer() {
    //画面(ウィンドウ)の幅、高さを取得
    const w = $(window).width();
    const h = $(window).height();

    // コンテンツ(#Manage-content)の幅、高さを取得
    const cw = $mManageContent.outerWidth();
    const ch = $mManageContent.outerHeight();

    //センタリングを実行する
    $mManageContent.css({
      'left': ((w - cw) / 2) + 'px',
      'top': ((h - ch) / 2) + 'px'
    });

  }

  /**
   * updateManageButtonText - 管理ボタンのテキストを更新
   *
   * @return {void}        description
   */
  function updateManageButtonText() {
    $mMngButton.text('NGリスト管理(現在の登録数:' + GM_listValues().length + ')');
  }

  /**
   * 管理モーダルのヘッダテキストを更新
   */
  const updateManageHeaderText = {
    /**
     * all - 全件取得時のヘッダテキスト更新
     *
     * @return {void}  description
     */
    all : function() {
      $mManageHeader.text('NG登録一覧(登録数:'+GM_listValues().length+')');
    },

    /**
     * part - 条件一致取得時のヘッダテキストに更新
     *
     * @param  {string} orgUserName ヘッダに表示する呼び出し元ユーザ名
     * @return {void}             description
     */
    part : function(orgUserName) {
      $mManageHeader.text('「'+orgUserName+'」と一致するNG登録一覧');
    }
  };


  (function() {
    const $body = $('body');
    createManageButton();
    createManageWindow();
    createNGButton($body);
    ngProc($body);
    readMoreObserver();
    $(window).resize(centeringManageSyncer);

  })();



})(jQuery);
