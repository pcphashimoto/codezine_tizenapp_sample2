//Initialize function
var init = function() {
	// TODO:: Do your initialization job
	console.log("init() called");

	// add eventListener for tizenhwkey
	document.addEventListener('tizenhwkey', function(e) {
		if (e.keyName == "back")
			tizen.application.getCurrentApplication().exit();
	});

	/**
	 * カメラ画像ファイル取得のコールバック
	 */
	$("#imageInput").change(function(e) {
		var file = e.target.files[0];
		var reader = new FileReader();
		reader.onload = onReadImage;
		if (file.type.match('image.*')) {
			reader.readAsDataURL(file);
		}
	});
	/**
	 * ボタンを押すとINPUTエレメントを反応させる
	 */
	$("#startCamera").click(function() {
		$("#imageInput").click();
	});
	
	/**
	 * INPUTエレメントを動的に作成し、ギャラリーから画像を読み込む
	 */
	$("#readFromGallery").click(function(){
		$("<input>").attr({
			type: "file",
			accept: "image/*",
			capture: "filesystem"
		}).change(function(e){
			var file = e.target.files[0];
			var reader = new FileReader();
			reader.onload = onReadImage;
			if (file.type.match('image.*')) {
				reader.readAsDataURL(file);
			}
		}).click()
	})

	/**
	 * カメラ画像のイメージデータをDataURLの形式で取得した時のコールバック
	 * 
	 * @param e
	 */
	function onReadImage(e) {
		var imageSrc = e.target.result;

		/**
		 * Case1. カメラから取得した画像を表示するのみ
		 */
		//$("#inputImage").attr("src", imageSrc);

		/**
		 * Case2. 画像をCanvasを利用して縮小、回転し、文字を載せて貼り付ける
		 */

		// Exif情報からOrientationを取得
		var orientation = getOrientation(imageSrc) || 1;
		console.log(orientation)

		// 一時的なIMAGEエレメントを作成し、一時的なCANVASで画像処理をしてIMGを出力する
		var onLoadImageElement = function(e) {
			var imgEl = e.target;
			
			// 画像の本来の解像度を取得
			var w = imgEl.naturalWidth;
			var h = imgEl.naturalHeight;

			// canvasの解像度を指定
			var canvasWidth = 400;
			var canvasHeight = 400;
			var canvas = $("<canvas>").attr({
				width : canvasWidth,
				height : canvasHeight
			})

			// canvasの描画コンテキストを取得
			var context = canvas[0].getContext('2d');
			// これから変更する回転状態を一旦保存
			context.save();

			switch (orientation) {
			case 3:
				// 180 rotate left
				context.translate(canvasWidth, canvasHeight);
				context.rotate(Math.PI);
				break;
			case 6:
				// 90 rotate right
				context.rotate(0.5 * Math.PI);
				context.translate(0, -canvasHeight);
				break;
			case 8:
				// 90 rotate left
				context.rotate(-0.5 * Math.PI);
				context.translate(-canvasWidth, 0);
				break;
			default:
			}

			// canvasの幅に短辺を合わせて中心に描画する処理
			if (w > h) {
				context.drawImage(imgEl, (w - h) / 2, 0, h, h, 0, 0,
						canvasWidth, canvasHeight)
			} else {
				context.drawImage(imgEl, 0, (h - w) / 2, w, w, 0, 0,
						canvasWidth, canvasHeight)
			}
			// 文字などを上書きするために回転状態を解除する
			context.restore();
			
			// 文字などを張り付けていく
			var caption = "#MyTizenCameraApp";
			context.font = "32px 'Baumans','Tizen','Helvetica'";
			context.lineWidth = 5;
			context.strokeStyle = "#333333";
			context.strokeText(caption, 30, canvasHeight - 30);	
			context.fillStyle = "#dbd0e6";
			context.fillText(caption, 30, canvasHeight - 30);
			
			//画像を出力する
			var inputImg = $("#inputImage").attr("src", canvas[0].toDataURL("image/png"));

			//vintageJSの初期化オプション
			var option = {
				//出力データ形式を選択（JpegとPNGが指定できます）
				mime : "image/png",
				//処理開始時のハンドラ
				onStart : function() {
					console.log("onStart");
					$.mobile.loading( 'show' )
				},
				//処理終了時のハンドラ
				onStop : function() {
					console.log("onStop");
					$.mobile.loading( 'hide' )
				},
				//エラーハンドラ
				onError : function() {
					$.mobile.loading( 'hide' )
					alert('ERROR');
				}
			}
			//vintageJSでIMAGEエレメントを初期化する
			inputImg.vintage(option).data('vintageJS').apply();
			
			/**
			 * ページ２へ移動
			 */
			$.mobile.changePage("#two");
			
		}
		$("<img>").load(onLoadImageElement).attr("src", imageSrc);		
	}
	
	/**
	 * 画像にエフェクトを掛ける
	 * 
	 */
	$("#filters button").click(function() {
		var presetName = $(this).data("preset");
		var vjsAPI = $("#inputImage").data("vintageJS");
		if (vintagePresets[presetName]) {
			vjsAPI.vintage(vintagePresets[presetName]);
		} else {
			//presetが見つからない場合はリセットする(normalなど)
			vjsAPI.reset();
		}
	});


	/**
	 * 画像を端末に保存し、ギャラリーに登録する
	 * 
	 */
	$("#saveButton").click(function(){
		var imageSrc = $("#inputImage").attr("src");
		if(!imageSrc) return;
		
		$.mobile.loading( 'show' );
		//保存するファイル名
		var fileName = "codezine" + new Date().getTime() + ".png";
		//保存するイメージデータ。dataURL形式のIMAGEエレメントのSRCデータのヘッダ部を取り除く
		var content = imageSrc.replace(/^data:image\/(png|jpeg);base64,/, "");
		//エラーコールバック
		var errorCallback = function(e){
			console.error(e);
			$.mobile.loading( 'hide' );
		}

		//イメージディレクトリを読み書きモードで開く
		tizen.filesystem.resolve("images", function(dir) {
			//ファイルを新規作成する
			var file = dir.createFile(fileName);
			//ファイルストリームを書き込みモードで開く
			file.openStream("w", function(fs) {
				//ファイルストリームにbase64形式のデータを書き込む
				fs.writeBase64(content);
				//ファイルストリームを閉じる
				fs.close();
				//ギャラリーに登録する
				tizen.content.scanFile(file.toURI(), function(){
					console.log("scan success")
				}, errorCallback);

				$.mobile.loading( 'hide' );
				alert("Saving image Succeeded");				

				//３ページ目に移動
				$("#savedImage").attr("src", $("#inputImage").attr("src"));
				$.mobile.changePage("#three");	
				
			}, errorCallback);
		}, errorCallback, "rw");
	});
	
	/**
	 * 画像をTWITTERに投稿してシェアする
	 * 
	 */
	$("#shareButton").click(function(){
		var imageSrc = $("#savedImage").attr("src");
		if(!imageSrc) return;

		$.mobile.loading( 'show' );
		var imageBlob = dataURItoBlob(imageSrc);
		
		oauthFunc(function(oauth){
			var data = {
				status : $("#status").val() || "Hello Tizen ! #codezine",
				"media[]" : imageBlob
			}

			oauth.post("https://api.twitter.com/1.1/statuses/update_with_media.json",
					data,
					function(data){
						$.mobile.loading( 'hide' );
						console.log(JSON.stringify(data))
						alert("Sharing image Succeeded");
					},
					function(e){
						$.mobile.loading( 'hide' );
						console.error(e)
						alert("Sharing image Failed!");
					})
			},function(e){
				$.mobile.loading( 'hide' );
				console.error(e)
				alert("Sharing image Failed!");
			});
	});



};
$(document).ready(init);