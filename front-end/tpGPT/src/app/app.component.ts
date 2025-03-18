import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
  <div class="container">
    <div class="sidebar">
      <h3>Conversations</h3>
      <button class="new-conversation" (click)="startNewConversation()">+ Nouvelle conversation</button>
      <ul>
        <li *ngFor="let conv of conversations" class="conversation-item" (click)="loadConversation(conv._id)">
          <span class="conversation-title">
            <strong>{{ conv.messages.length > 0 ? conv.messages[0].message : 'Nouvelle conversation' }}</strong>
          </span>
          <button class="delete-btn" (click)="deleteConversation(conv._id, $event)">🗑</button>
        </li>
      </ul>
    </div>

    <div class="chat-container">
      <div class="chat-box" *ngFor="let msg of conversation" [ngClass]="{'user-message': msg.sender === 'User', 'bot-message': msg.sender === 'ChatGPT'}">
        <p><strong>{{ msg.sender }}:</strong> {{ cleanMessage(msg.message) }}</p>
        <button class="toggle-think" (click)="toggleThink(msg)">Afficher/Cacher la réflexion</button>
        <p *ngIf="msg.showFullText">{{ msg.message }}</p>
      </div>
      <div class="input-container">
        <input type="text" [(ngModel)]="userInput" (keyup.enter)="sendMessage()" placeholder="Type a message..." />
        <button (click)="sendMessage()">➤</button>
      </div>
    </div>
  </div>
`,
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  userInput: string = '';
  conversations: any[] = [];
  conversation: { sender: string; message: string; showFullText?: boolean }[] =
    [];
  currentConversationId: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchConversations();
  }

  fetchConversations() {
    this.http.get<any[]>('http://localhost:3000/conversations').subscribe(
      (data) => (this.conversations = data),
      (error) => console.error('Error fetching conversations:', error)
    );
  }

  startNewConversation() {
    this.http
      .post<{ conversationId: string }>(
        'http://localhost:3000/new-conversation',
        {}
      )
      .subscribe(
        (response) => {
          this.currentConversationId = response.conversationId;
          this.conversation = [];
          this.fetchConversations();
        },
        (error) => console.error('Error creating new conversation:', error)
      );
  }

  loadConversation(id: string) {
    this.currentConversationId = id;
    this.http.get<any>(`http://localhost:3000/conversation/${id}`).subscribe(
      (data) =>
        (this.conversation = data.messages.map((msg: any) => ({
          ...msg,
          showFullText: false,
        }))),
      (error) => console.error('Error loading conversation:', error)
    );
  }

  deleteConversation(id: string, event: Event) {
    event.stopPropagation();
    this.http.delete(`http://localhost:3000/conversation/${id}`).subscribe(
      () => this.fetchConversations(),
      (error) => console.error('Error deleting conversation:', error)
    );
  }

  sendMessage() {
    if (!this.userInput.trim() || !this.currentConversationId) return;

    const userMessage = this.userInput;
    this.userInput = '';

    this.http
      .post<any>(`http://localhost:3000/chat/${this.currentConversationId}`, {
        message: userMessage,
      })
      .subscribe(
        (response) => {
          if (response && response.messages) {
            this.conversation = response.messages.map((msg: any) => ({
              ...msg,
              showFullText: false,
            }));
          }
          this.fetchConversations();
        },
        (error) => console.error('Error sending message:', error)
      );
  }

  cleanMessage(message: string): string {
    const thinkTag = '</think>';
    const thinkIndex = message.indexOf(thinkTag);
    return thinkIndex !== -1
      ? message.substring(thinkIndex + thinkTag.length).trim()
      : message;
  }

  toggleThink(msg: any) {
    msg.showFullText = !msg.showFullText;
  }
}
