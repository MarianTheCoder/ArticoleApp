var maxAbsoluteSum = function(nums) {
    let sum = 0;
    let maxx = -Infinity;
    for (let i = 0; i < nums.length; i++) {
        sum = sum + nums[i];
        if(sum < 0) sum = 0;
        else maxx = Math.max(maxx, sum);
    }
    for (let i = 0; i < nums.length; i++) {
        sum = sum + nums[i];
        if(sum > 0) sum = 0;
        else maxx = Math.max(maxx, Math.abs(sum));
    }
    console.log(maxx);
};

maxAbsoluteSum([2,-5,1,-4,3,-2])