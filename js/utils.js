function getOrientation(imgDataURL) {
	var byteString = atob(imgDataURL.split(',')[1]);
	var orientaion = byteStringToOrientation(byteString);
	return orientaion;

	function byteStringToOrientation(img) {
		var head = 0;
		var orientation;
		while (1) {
			if (img.charCodeAt(head) == 255 & img.charCodeAt(head + 1) == 218) {
				break;
			}
			if (img.charCodeAt(head) == 255 & img.charCodeAt(head + 1) == 216) {
				head += 2;
			} else {
				var length = img.charCodeAt(head + 2) * 256
						+ img.charCodeAt(head + 3);
				var endPoint = head + length + 2;
				if (img.charCodeAt(head) == 255
						& img.charCodeAt(head + 1) == 225) {
					var segment = img.slice(head, endPoint);
					var bigEndian = segment.charCodeAt(10) == 77;
					if (bigEndian) {
						var count = segment.charCodeAt(18) * 256
								+ segment.charCodeAt(19);
					} else {
						var count = segment.charCodeAt(18)
								+ segment.charCodeAt(19) * 256;
					}
					for (i = 0; i < count; i++) {
						var field = segment.slice(20 + 12 * i, 32 + 12 * i);
						if ((bigEndian && field.charCodeAt(1) == 18)
								|| (!bigEndian && field.charCodeAt(0) == 18)) {
							orientation = bigEndian ? field.charCodeAt(9)
									: field.charCodeAt(8);
						}
					}
					break;
				}
				head = endPoint;
			}
			if (head > img.length) {
				break;
			}
		}
		return orientation;
	}
}

function dataURItoBlob(dataURI, type) {
	var binary = atob(dataURI.split(',')[1]);
	var array = [];
	for ( var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([ new Uint8Array(array) ], {
		type : type || 'image/png'
	});
}

var oauthFunc = (function() {
	var options = {
		// TwitterのAPI情報
		requestTokenUrl : "https://api.twitter.com/oauth/request_token",
		authorizationUrl : "https://api.twitter.com/oauth/authorize",
		accessTokenUrl : "https://api.twitter.com/oauth/access_token",

		// Twitterで登録したアプリのkey/secret
		consumerKey : 'xaDiMWg3HTwj651Ce1Ax5Q',
		consumerSecret : 'eJfHZQmzC24QZO329r7VxPSMgZcK68Z9dOnzEJd6rDA',
	};

	// キャッシュから取得
	var accessTokenStr = localStorage.getItem("accessToken");
	if (accessTokenStr) {
		var accessToken = JSON.parse(accessTokenStr);
		options.accessTokenKey = accessToken.key;
		options.accessTokenSecret = accessToken.secret;
	}

	// oauthの新規作成
	var oauth = OAuth(options);

	return function(successCallback, errorCallback) {
		var onerror = function(e) {
			console.error(e)
			oauth.setAccessToken("", "")
			errorCallback && errorCallback(e)
		}
		// 既に認証済みならそのまま返す
		console.log(oauth.getAccessTokenKey());
		if (oauth.getAccessTokenKey()) {
			successCallback && successCallback(oauth);
			return;
		}

		// リクエストトークンの取得
		oauth.fetchRequestToken(function(url) {
			console.log(url)
			// ブラウザで認証画面を表示させる
			var appControl = new tizen.ApplicationControl(
					"http://tizen.org/appcontrol/operation/view", url);
			tizen.application.launchAppControl(appControl)

			// PINコードを入力する画面を用意
			var pin = window.prompt("Please enter your PIN", "");
			oauth.setVerifier(pin);
			oauth.fetchAccessToken(function(e) {
				// キャッシュを保存
				localStorage.setItem("accessToken", JSON.stringify({
					key : oauth.getAccessTokenKey(),
					secret : oauth.getAccessTokenSecret()
				}));
				// コールバック
				successCallback && successCallback(oauth)
			}, onerror);
		}, onerror)
	}
})();