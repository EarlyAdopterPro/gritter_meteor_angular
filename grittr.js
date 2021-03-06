Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {

 // This code only runs on the client
 angular.module('simple-todos',['angular-meteor']);


  function onReady() {
      angular.bootstrap(document, ['simple-todos']);
  }
         
 if (Meteor.isCordova)
     angular.element(document).on('deviceready', onReady);
 else
     angular.element(document).ready(onReady);


 angular.module('simple-todos').controller('TodosListCtrl', ['$scope','$meteor',
    function ($scope, $meteor) {

      // Subscribe to tah tasks
      $scope.$meteorSubscribe('tasks');

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

      $scope.setPrivate = function (task) {
        $meteor.call('setPrivate', task._id, !task.private);
      };

      $scope.$watch('hideCompleted', function(){
        if ($scope.hideCompleted)
          $scope.query = {checked: {$ne: true}};
        else
          $scope.query = {};
      });
      
      $scope.incompleteCount = function () {
        return Tasks.find ({checked: {$ne:true} }).count();
      };
      
      // Subscribe to all Users
      $scope.$meteorSubscribe('grittrAllUsers');
      $scope.grittrAllUsers = $meteor.collection(function(){
        return Meteor.users.find();
      });

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
      owner: Meteor.userId(),
      private:true

    });
  },

  deleteTask: function(taskId){
   Tasks.remove(taskId);
  },

  setChecked: function (taskId, setChecked){
    Tasks.update(taskId, { $set: {checked: setChecked}}); 
  },

  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    //Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error('not-authorized');
    }

    Tasks.update(taskId, {$set: {private: setToPrivate } });
  }
});

if (Meteor.isServer) {
  Meteor.publish('tasks', function (){
    return Tasks.find(
      {
        $or: [
          { private: {$ne: true} },
          { owner: this.userId}
        ]
      });
  });

  // Publish all Users
  Meteor.publish('grittrAllUsers', function (){
    return Meteor.users.find(); 
  });
}



