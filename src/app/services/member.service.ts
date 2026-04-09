import { Injectable } from '@angular/core';

export interface Member {
  id: string;
  name: string;
  time: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class MemberService {

  members: Member[] = [
    { id:'M001', name:'John Doe', time:'4h 0m', status:'Active' },
    { id:'M002', name:'Sarah Smith', time:'3h 0m', status:'Active' },
    { id:'M003', name:'Mike Johnson', time:'0h 30m', status:'Low Time' },
  ];

  getMembers(){
    return this.members;
  }

  addMember(name:string, contact:string, email:string){
    const newMember: Member = {
      id: 'M' + (this.members.length + 1).toString().padStart(3,'0'),
      name: name,
      time: '0h 0m',
      status: 'Active'
    };

    this.members.push(newMember);
  }

}