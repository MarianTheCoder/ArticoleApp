var findMin = function(nums) {
    let left = 0;
    let right = nums.length - 1;
    let minVal = nums[0];

    while (left <= right) {
        if (nums[left] < nums[right]) {
            minVal = Math.min(minVal, nums[left]);
            break;  // Array is already sorted, so take the leftmost value.
        }

        let mid = Math.floor((left + right) / 2);
        minVal = Math.min(minVal, nums[mid]);

        // Decide which half to search
        if (nums[mid] >= nums[left]) {
            // Pivot is in the right half
            left = mid + 1;
        } else {
            // Pivot is in the left half
            right = mid - 1;
        }
    }

    console.log(minVal);
};

findMin([2, 3, 1]);  // Output: 1
