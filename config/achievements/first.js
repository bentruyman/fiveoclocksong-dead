var handle;

var achieved = Array();

exports.init = function (providedHandle) {
	inspect('first! added');
	handle = providedHandle;
	handle.addListener('vote', check);
};

function check (payload) {
	
	var songs = handle.getData(payload.user, 'songs');

	if (!handle.isAchieved(payload.user)){
		
		if (typeof songs === 'undefined') {

			songs = {};
			songs[payload.song._id] = 1;
			inspect(songs);
			handle.setData(payload.user, 'songs', songs);

		} 
		
		if(achieved[payload.poll._id] === true){
			inspect("ALREADY ACHIEVED TODAY, YO!");
		}else{
			
			payload.poll.songs.forEach(function(item,index){

				item.voters.forEach(function(voter,i){

					if(voter.name === payload.user.name){

						if(voter.count === 20){

							handle.setData(payload.user, 'songs', songs);
							handle.achieve(payload.user);
							
							achieved[payload.poll._id] = true;
							
						}else{

							achieved[payload.poll._id] = false;

						}

					}

				});

			});
			
			
		}
		
		
	
	}

}
