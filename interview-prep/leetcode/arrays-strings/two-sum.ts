/**
 * Problem: Two Sum (LeetCode 1)
 * Given an array of integers `nums` and an integer `target`, return the
 * indices of the two numbers that add up to `target`.
 *
 * Time:  O(n)
 * Space: O(n)
 */
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>()

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]
    if (seen.has(complement)) {
      return [seen.get(complement)!, i]
    }
    seen.set(nums[i], i)
  }

  return []
}

console.log(twoSum([2, 7, 11, 15], 9)) // [0, 1]
