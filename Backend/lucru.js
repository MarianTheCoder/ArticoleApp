var countBadPairs = function(nums) {
    let totalNumber = Math.floor((nums.length*(nums.length-1))/2);
    console.log(totalNumber);
    let map = new Map();
    for (let i = 0; i < nums.length; i++) {
        let sum = nums[i] - i;
        if(!map.has(sum)) map.set(sum, 1);
        else{
            totalNumber = totalNumber - map.get(sum);
            map.set(sum, map.get(sum) + 1);
        }
    }
    console.log(totalNumber);
};

countBadPairs([1,2,3,4,5]);