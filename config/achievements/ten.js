var session;

exports.init = function(s){
	
	inspect('Ten added');
	
};

exports.event = 'vote';

exports.check = function(options){

	inspect("check achievement: ten");

	var condition;
	
	self.songs[options.index].voters.forEach(function(item,i){
		
		if(item.name === options.session.name){
			
			if(item.count === 10){
				condition = true;
			}else{
				condition = false;
			}
			
		}
		
	});
	
	return condition;
	
};


