var handle;

exports.init = function (providedHandle) {
	inspect('you kids added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {

	var ids = [
		'5cee1ffe0f802fef19d7c555b5a2fd1d',
		'5aaa90a808fcd0c6aa904390348ee0ea',
		'1bfc922ed136c1bbd323f71edb9cbe32',
		'5190037054cdaf81fb106d11136fe414',
		'1ab961839e01fbcff8463b865f7177d8',
		'3ca179e131d0e29c91809d4f4f12ba00',
		'59b219dc79d1e842bc4ee3d2c4a57f4d',
		'4c3a7dfdbfbb72ee9d60687b4efc319e',
		'077acc970ffdfa315798d7165cbb6175',
		'98c1aff7af35cd4c4e4bba8c7b12088e',
		'8fc6f01332f53833ffa99791dea0c7ed',
		'7bdbb2ef7004fa86059a606817f21950',
		'b702b62f459d41470e04a7e79605b276',
		'a6be372cd2ab7a74d2598d8268181dc2',
		'78de4d92399c6ea7a1996f6396bab387',
		'c051c3e9816cd0328887c55beebd6afe',
		'97d9c592caa50df98b11201c12d4484c',
		'703133953603336ac4680da5368d298a',
		'8dcd049836ed96dbf8c492ffbcb66561',
		'7ffe28fd9ae9ccb67f02d20ef1f64405',
		'adeb04cd8529b2343bbb4f002caf06cc',
		'7ce85270db46f6d15e50ec4d6969b20c'
	];
	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		
		if (typeof songs === 'undefined') {

			songs = {};
			songs[payload.song._id] = 1;
			handle.setData(payload.user, 'songs', songs);

		} 
			
		if(ids.indexOf(payload.song._id) !== -1){
			handle.setData(payload.user, 'songs', songs);
			handle.achieve(payload.user);
		}else{
			inspect('NOT YET!!!');
		}
		
		
	}

}
