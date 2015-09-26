Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {

 // This code only runs on the client
 angular.module('simple-todos',['angular-meteor']);

 angular.module('simple-todos').controller('TodosListCtrl', ['$scope','$meteor',
    function ($scope, $meteor) {
      $scope.tasks = $meteor.collection(function(){
        return Tasks.find($scope.getReactively('query'), {sort:{createdAt:-1}})
      }); 
      
      $scope.addTask = function (newTask, taskImportant){
        $meteor.call('addTask', newTask, taskImportant); 
      };

      $scope.deleteTask = function (task) {
        $meteor.call('deleteTask', task._id);
      }

      $scope.setChecked = function (task) {
        $meteor.call('setChecked', task._id, !task.checked); 
      }


      $scope.$watch('hideCompleted', function(){
        if ($scope.hideCompleted)
          $scope.query = {checked: {$ne: true}};
        else
          $scope.query = {};
      });
      
      $scope.incompleteCount = function () {
        return Tasks.find ({checked: {$ne:true} }).count();
      };

    }]);
}

Meteor.methods ({
  addTask: function (text, important) {
    // Make sure the user is looged in before inserting a task  
    if (!Meteor.userId()){
      throw new Meteor.Error('non-authorized');
    }

    Tasks.insert({
      text:text,
      important:important,
      createdAt:new Date(),
      owner: Meteor.userId()
    });
  },

  deleteTask: function(taskId){
   Tasks.remove(taskId);
  },

  setChecked: function (taskId, setChecked){
    Tasks.update(taskId, { $set: {checked: setChecked}}); 
  }
})

